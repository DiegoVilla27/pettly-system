import type { OrganizationAccess } from '../../../organizations/application/ports/in/organization-access';
import type { BusinessNotifications } from '../../../notifications/application/ports/in/business-notifications';
import { isDeepStrictEqual } from 'node:util';
import { ApplicationError } from '../../../../shared/domain/application-error';
import { administrativeReason } from '../../../../shared/domain/authorization';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { Authorization } from '../../../authorization/application/ports/in/authorization';
import type { CatalogAccess } from '../../../catalog/application/ports/in/catalog-access';
import type { CartCheckout } from '../../../cart/application/ports/in/cart-checkout';
import type { OrderStock } from '../../../inventory/application/ports/in/order-stock';
import type { InventoryUseCases } from '../../../inventory/application/ports/in/inventory-use-cases';
import { Order } from '../../domain/aggregates/order';
import {
  address,
  money,
  tax,
  validatePolicy,
} from '../../domain/value-objects/checkout';
import type { CheckoutSnapshot } from '../../domain/value-objects/checkout';
import type {
  OrdersRepository,
  OrdersWork,
} from '../ports/out/orders-repository';
import type { OrdersUseCases } from '../ports/in/orders-use-cases';
import type { OrderPayments } from '../ports/in/order-payments';
import type { CommissionPolicy } from '../../../payments/application/ports/in/commission-policy';
import type {
  PolicyCommand,
  QuoteCommand,
  CreateOrderCommand,
  OrderDecisionCommand,
} from '../commands/order.commands';
import type { OrdersQuery } from '../queries/order.queries';
import type { OrderState } from '../results/order';
export class OrdersHandlers implements OrdersUseCases, OrderPayments {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly cart: CartCheckout,
    private readonly catalog: CatalogAccess,
    private readonly stock: OrderStock,
    private readonly inventory: InventoryUseCases,
    private readonly auth: Authorization,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
    private readonly commission?: CommissionPolicy,
    private readonly notices?: BusinessNotifications,
    private readonly organizations?: OrganizationAccess,
  ) {}
  private missing(): never {
    throw new ApplicationError(
      'RESOURCE_NOT_FOUND',
      'Order or checkout quote was not found.',
    );
  }
  private conflict(message: string): never {
    throw new ApplicationError('CONFLICT', message);
  }
  private async user(tx: OrdersWork, id: string) {
    await tx.lock(`user:${id}`);
    await this.auth.requirePermission(id, 'orders.self.manage');
  }
  private async audit(
    tx: OrdersWork,
    o: OrderState,
    actorId: string | null,
    action: string,
    reason: string,
    requestId: string,
  ) {
    const auditId = this.entropy.id();
    await tx.audit({
      id: auditId,
      orderId: o.id,
      version: o.version,
      actorId,
      action,
      reason: administrativeReason(reason),
      requestId,
      createdAt: this.clock.now(),
    });
    if (this.notices) {
      const org = await this.organizations?.findOrganization(o.organizationId);
      await this.notices.publish({
        eventKey: auditId,
        category: 'orders',
        eventType: `order.${action}`,
        subjectType: 'order',
        subjectId: o.id,
        subjectVersion: o.version,
        status: o.status,
        recipientIds: [
          o.buyerId,
          ...(org?.responsibleUserId ? [org.responsibleUserId] : []),
        ],
        now: this.clock.now(),
      });
    }
  }
  private async visible(actorId: string, o: OrderState) {
    if (actorId === o.buyerId) return;
    await this.auth.requirePermission(
      actorId,
      'orders.fulfillment.manage',
      o.organizationId,
    );
  }
  private async load(tx: OrdersWork, id: string) {
    const initial = await tx.order(id);
    if (!initial) this.missing();
    await tx.lock(`organization:${initial.organizationId}`);
    await tx.lock(`order:${id}`);
    const state = await tx.order(id);
    if (!state) this.missing();
    return Order.restore(state);
  }
  private context(o: OrderState) {
    return {
      orderId: o.id,
      version: o.version,
      buyerId: o.buyerId,
      organizationId: o.organizationId,
      expiresAt: o.expiresAt,
      lines: o.snapshot.lines.map((l) => ({
        variantId: l.variantId,
        holdId: l.holdId,
        quantity: l.quantity,
      })),
    };
  }
  private async expire(tx: OrdersWork, o: Order) {
    if (o.expire(this.clock.now())) {
      const s = o.snapshot();
      await this.stock.closeOrder(
        this.context(s),
        'release',
        null,
        this.entropy.id(),
      );
      await tx.saveOrder(s);
      await this.audit(
        tx,
        s,
        null,
        'expired',
        'Unpaid order expired at its persisted payment deadline.',
        this.entropy.id(),
      );
    }
  }
  policy(actorId: string, org: string) {
    return this.repo.run(async (tx) => {
      await this.user(tx, actorId);
      await tx.lock(`organization:${org}`);
      await this.auth.requirePermission(actorId, 'orders.settings.manage', org);
      return tx.policy(org);
    });
  }
  configure(c: PolicyCommand) {
    return this.repo.run(async (tx) => {
      await this.user(tx, c.actorId);
      await tx.lock(`organization:${c.organizationId}`);
      await this.auth.requirePermission(
        c.actorId,
        'orders.settings.manage',
        c.organizationId,
      );
      const old = await tx.policy(c.organizationId);
      if ((old?.version ?? 0) !== c.expectedVersion)
        this.conflict('Commercial policy changed; read its current version.');
      const p = {
        ...c.data,
        organizationId: c.organizationId,
        version: (old?.version ?? 0) + 1,
        updatedAt: this.clock.now(),
      };
      validatePolicy(p);
      const ids = Object.keys(p.taxRates);
      if (ids.length) {
        const variants = await this.catalog.variants(ids);
        if (
          variants.length !== ids.length ||
          variants.some((v) => v.organizationId !== c.organizationId)
        )
          throw new ApplicationError(
            'INVALID_INPUT',
            'Tax rates must reference this business variants.',
          );
      }
      await tx.savePolicy(p);
      await tx.policyAudit(
        c.actorId,
        c.organizationId,
        p.version,
        administrativeReason(c.reason),
        c.requestId,
        this.clock.now(),
        this.entropy.id(),
      );
      return p;
    });
  }
  private async snapshot(
    tx: OrdersWork,
    buyerId: string,
    version: number,
    fulfillment: 'pickup' | 'delivery',
    contact: CheckoutSnapshot['contact'],
  ) {
    const cart = await this.cart.read(buyerId);
    if (cart.version !== version || !cart.items.length || !cart.organizationId)
      this.conflict('Read a nonempty current cart before checkout.');
    await tx.lock(`organization:${cart.organizationId}`);
    const initial = await this.catalog.saleVariants(
      cart.items.map((l) => l.variantId),
    );
    for (const id of [...new Set(initial.map((v) => v.productId))].sort())
      await tx.lock(`product:${id}`);
    await tx.lock('catalog:categories');
    const variants = await this.catalog.saleVariants(
      cart.items.map((l) => l.variantId),
    );
    if (
      variants.length !== cart.items.length ||
      variants.some(
        (v) =>
          v.organizationId !== cart.organizationId ||
          v.currency !== cart.currency,
      )
    )
      this.conflict('A cart item is no longer purchasable; update the cart.');
    const policy = await tx.policy(cart.organizationId);
    if (!policy?.enabled || policy.currency !== cart.currency)
      this.conflict(
        'The business must configure matching enabled commercial terms before checkout.',
      );
    validatePolicy(policy);
    const delivery = address(contact);
    if (
      policy.currency !== 'COP' ||
      delivery.countryCode !== 'CO' ||
      (fulfillment === 'pickup' && policy.pickupAddress?.countryCode !== 'CO')
    )
      this.conflict('New checkout is available only in Colombia and COP.');
    let shippingMinor = 0;
    if (fulfillment === 'pickup' && !policy.pickupAddress)
      this.conflict('Pickup is not configured.');
    if (fulfillment === 'delivery') {
      const rule = policy.shippingRules.find(
        (r) =>
          r.countryCode === delivery.countryCode &&
          r.city.trim().toLocaleLowerCase('en') ===
            delivery.city.toLocaleLowerCase('en'),
      );
      if (!rule)
        this.conflict('Delivery is not configured for this city and country.');
      shippingMinor = rule.feeMinor;
    }
    const available = new Map(
      (await this.inventory.availability(variants.map((v) => v.id))).map(
        (v) => [v.variantId, v.available],
      ),
    );
    const lines = cart.items.map((item) => {
      const v = variants.find((v) => v.id === item.variantId)!;
      if ((available.get(v.id) ?? 0) < item.quantity)
        this.conflict('Insufficient available stock for checkout.');
      const subtotalMinor = money(v.priceMinor * item.quantity);
      const rate = policy.taxRates[v.id];
      if (policy.taxMode === 'added' && rate === undefined)
        this.conflict(
          'An explicit tax rate is required for every purchased variant.',
        );
      return {
        variantId: v.id,
        productId: v.productId,
        productVersion: v.productVersion,
        name: v.name,
        sku: v.sku,
        attributes: v.attributes,
        quantity: item.quantity,
        unitPriceMinor: v.priceMinor,
        subtotalMinor,
        taxMinor: policy.taxMode === 'added' ? tax(subtotalMinor, rate) : 0,
        holdId: this.entropy.id(),
      };
    });
    const subtotalMinor = money(lines.reduce((n, l) => n + l.subtotalMinor, 0));
    const taxMinor =
      policy.taxMode === 'added'
        ? money(
            lines.reduce((n, l) => n + l.taxMinor, 0) +
              tax(shippingMinor, policy.shippingTaxBasisPoints),
          )
        : null;
    const snapshot: CheckoutSnapshot = {
      ...(this.commission
        ? {
            commission: this.commission.allocate(
              subtotalMinor,
              money(subtotalMinor + shippingMinor + (taxMinor ?? 0)),
            ),
          }
        : {}),
      organizationId: cart.organizationId,
      currency: policy.currency,
      lines,
      fulfillment,
      contact: delivery,
      pickupAddress: fulfillment === 'pickup' ? policy.pickupAddress : null,
      subtotalMinor,
      shippingMinor,
      taxMinor,
      totalMinor: money(subtotalMinor + shippingMinor + (taxMinor ?? 0)),
      taxMode: policy.taxMode,
      collector: policy.collector,
      terms: policy.terms,
      policyVersion: policy.version,
    };
    return { cart, snapshot };
  }
  quote(c: QuoteCommand) {
    return this.repo.run(async (tx) => {
      await this.user(tx, c.buyerId);
      const { cart, snapshot } = await this.snapshot(
        tx,
        c.buyerId,
        c.expectedCartVersion,
        c.fulfillment,
        c.contact,
      );
      const now = this.clock.now();
      const q = {
        id: this.entropy.id(),
        buyerId: c.buyerId,
        cartId: cart.id,
        cartVersion: cart.version,
        snapshot,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 5 * 60000),
      };
      await tx.saveQuote(q);
      return q;
    });
  }
  quoteDetail(actorId: string, id: string) {
    return this.repo.run(async (tx) => {
      await this.user(tx, actorId);
      const q = await tx.quote(id);
      if (!q || q.buyerId !== actorId) this.missing();
      return q;
    });
  }
  create(c: CreateOrderCommand) {
    return this.repo.run(async (tx) => {
      await this.user(tx, c.buyerId);
      const fingerprint = JSON.stringify({
        quoteId: c.quoteId,
        total: c.expectedTotalMinor,
        consent: c.consent,
      });
      const existing = await tx.replay(c.buyerId, c.idempotencyKey);
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          this.conflict('Idempotency key was used with different order data.');
        const replay = await this.load(tx, existing.id);
        await this.expire(tx, replay);
        return replay.snapshot();
      }
      const q = await tx.quote(c.quoteId);
      if (!q || q.buyerId !== c.buyerId) this.missing();
      if (
        !c.consent ||
        q.snapshot.totalMinor !== c.expectedTotalMinor ||
        q.expiresAt <= this.clock.now()
      )
        this.conflict(
          'Explicit consent to the unexpired quote and exact total is required.',
        );
      const { snapshot } = await this.snapshot(
        tx,
        c.buyerId,
        q.cartVersion,
        q.snapshot.fulfillment,
        q.snapshot.contact,
      );
      const normalize = (s: CheckoutSnapshot) => ({
        ...s,
        lines: s.lines.map(({ holdId, ...line }) => {
          void holdId;
          return line;
        }),
      });
      if (!isDeepStrictEqual(normalize(snapshot), normalize(q.snapshot)))
        this.conflict(
          'Prices, terms or products changed; obtain and accept a new quote.',
        );
      const o = Order.create(
        this.entropy.id(),
        c.buyerId,
        q,
        c.idempotencyKey,
        fingerprint,
        this.clock.now(),
      );
      const state = o.snapshot();
      await tx.saveOrder(state);
      await this.stock.reserveOrder(this.context(state), c.requestId);
      await this.cart.consume(c.buyerId, q.cartVersion);
      await this.audit(
        tx,
        state,
        c.buyerId,
        'created',
        'Customer accepted the checkout quote and commercial conditions.',
        c.requestId,
      );
      return state;
    });
  }
  get(actorId: string, id: string) {
    return this.repo.run(async (tx) => {
      await this.user(tx, actorId);
      const o = await this.load(tx, id);
      await this.visible(actorId, o.snapshot());
      await this.expire(tx, o);
      return o.snapshot();
    });
  }
  list(q: OrdersQuery) {
    return this.repo.run(async (tx) => {
      await this.user(tx, q.actorId);
      if (q.organizationId) {
        await tx.lock(`organization:${q.organizationId}`);
        await this.auth.requirePermission(
          q.actorId,
          'orders.fulfillment.manage',
          q.organizationId,
        );
      }
      return tx.list(q);
    });
  }
  cancel(c: OrderDecisionCommand) {
    return this.repo.run(async (tx) => {
      await this.user(tx, c.actorId);
      const o = await this.load(tx, c.orderId);
      await this.visible(c.actorId, o.snapshot());
      await this.expire(tx, o);
      o.expect(c.expectedVersion);
      o.cancel(this.clock.now());
      const state = o.snapshot();
      await this.stock.closeOrder(
        this.context(state),
        'release',
        c.actorId,
        c.requestId,
      );
      await tx.saveOrder(state);
      await this.audit(
        tx,
        state,
        c.actorId,
        'cancelled',
        c.reason,
        c.requestId,
      );
      return state;
    });
  }
  fulfill(c: OrderDecisionCommand) {
    return this.repo.run(async (tx) => {
      await this.user(tx, c.actorId);
      const o = await this.load(tx, c.orderId);
      await this.auth.requirePermission(
        c.actorId,
        'orders.fulfillment.manage',
        o.snapshot().organizationId,
      );
      o.expect(c.expectedVersion);
      if (!c.status)
        throw new ApplicationError(
          'INVALID_INPUT',
          'A fulfillment status is required.',
        );
      o.fulfill(c.status, this.clock.now());
      const state = o.snapshot();
      await tx.saveOrder(state);
      await this.audit(tx, state, c.actorId, c.status, c.reason, c.requestId);
      return state;
    });
  }
  audits(actorId: string, id: string, page: number, limit: number) {
    return this.repo.run(async (tx) => {
      await this.user(tx, actorId);
      const o = await this.load(tx, id);
      await this.visible(actorId, o.snapshot());
      return tx.audits(id, page, limit);
    });
  }
  settleVerified(
    id: string,
    paymentId: string,
    amount: number,
    currency: string,
    requestId: string,
  ) {
    return this.repo.run(async (tx) => {
      const o = await this.load(tx, id);
      if (o.settle(paymentId, amount, currency, this.clock.now())) {
        const state = o.snapshot();
        await this.stock.closeOrder(
          this.context(state),
          'consume',
          null,
          requestId,
        );
        await tx.saveOrder(state);
        await this.audit(
          tx,
          state,
          null,
          'paid',
          'Payment confirmed through the trusted verified payment port.',
          requestId,
        );
      }
      return o.snapshot();
    });
  }
  forPayment(actorId: string, id: string) {
    return this.repo.run(async (tx) => {
      await this.user(tx, actorId);
      const order = await this.load(tx, id);
      if (order.snapshot().buyerId !== actorId) this.missing();
      return order.snapshot();
    });
  }
  inspect(id: string) {
    return this.repo.run(async (tx) => (await this.load(tx, id)).snapshot());
  }
  policyAudits(actorId: string, org: string, page: number, limit: number) {
    return this.repo.run(async (tx) => {
      await this.user(tx, actorId);
      await tx.lock(`organization:${org}`);
      await this.auth.requirePermission(actorId, 'orders.settings.manage', org);
      return tx.policyAudits(org, page, limit);
    });
  }
  async expireDue() {
    const ids = await this.repo.run((tx) => tx.due(this.clock.now()));
    for (const id of ids)
      await this.repo.run(async (tx) => {
        const o = await this.load(tx, id);
        await this.expire(tx, o);
      });
  }
}
