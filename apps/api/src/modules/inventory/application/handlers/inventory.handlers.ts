import { ApplicationError } from '../../../../shared/domain/application-error';
import { administrativeReason } from '../../../../shared/domain/authorization';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { Authorization } from '../../../authorization/application/ports/in/authorization';
import type { CatalogAccess } from '../../../catalog/application/ports/in/catalog-access';
import type { VariantIdentity } from '../../../catalog/application/results/catalog';
import type { InventoryUseCases } from '../ports/in/inventory-use-cases';
import { Stock, Hold } from '../../domain/aggregates/stock';
import type {
  InventoryRepository,
  InventoryWork,
} from '../ports/out/inventory-repository';
import type {
  StockCommand,
  HoldCommand,
  HoldDecisionCommand,
} from '../commands/inventory.commands';
import type { StockQuery } from '../queries/inventory.queries';
import type { OrderStock, OrderStockContext } from '../ports/in/order-stock';
export class InventoryHandlers implements InventoryUseCases, OrderStock {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly catalog: CatalogAccess,
    private readonly auth: Authorization,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
  ) {}
  private async identity(variantId: string) {
    const variant = (await this.catalog.variants([variantId]))[0];
    if (!variant)
      throw new ApplicationError(
        'RESOURCE_NOT_FOUND',
        'Variant was not found.',
      );
    return variant;
  }
  private async locked(tx: InventoryWork, actorId: string, variantId: string) {
    await tx.lock(`user:${actorId}`);
    const v = await this.identity(variantId);
    await tx.lock(`organization:${v.organizationId}`);
    await tx.lock(`product:${v.productId}`);
    await tx.lock('catalog:categories');
    await tx.lock(`stock:${variantId}`);
    await this.auth.requirePermission(
      actorId,
      'inventory.manage',
      v.organizationId,
    );
    const current = await this.identity(variantId);
    const stock = Stock.restore(
      (await tx.stock(variantId)) ??
        Stock.empty(variantId, this.clock.now()).snapshot(),
    );
    await this.expire(tx, stock, current);
    return { stock, variant: current };
  }
  private async record(
    tx: InventoryWork,
    stock: Stock,
    variant: VariantIdentity,
    actorId: string | null,
    kind: string,
    onHandDelta: number,
    reservedDelta: number,
    key: string,
    fingerprint: string,
    reason: string,
    requestId: string,
    holdId: string | null = null,
  ) {
    stock.change(onHandDelta, reservedDelta, this.clock.now());
    await tx.saveStock(stock.snapshot());
    const state = stock.snapshot();
    const movement = {
      id: this.entropy.id(),
      variantId: variant.id,
      organizationId: variant.organizationId,
      actorId,
      holdId,
      kind,
      onHandDelta,
      reservedDelta,
      onHandAfter: state.onHand,
      reservedAfter: state.reserved,
      versionAfter: state.version,
      idempotencyKey: key,
      fingerprint,
      reason: administrativeReason(reason),
      requestId,
      createdAt: this.clock.now(),
    };
    await tx.addMovement(movement);
    return movement;
  }
  private async expire(
    tx: InventoryWork,
    stock: Stock,
    variant: VariantIdentity,
  ) {
    const now = this.clock.now();
    const expired = (await tx.holds(variant.id)).filter(
      (h) => h.expiresAt <= now,
    );
    if (!expired.length) return;
    const movements = expired.map((hold) => {
      stock.change(0, -hold.quantity, now);
      const state = stock.snapshot();
      return {
        id: this.entropy.id(),
        variantId: variant.id,
        organizationId: variant.organizationId,
        actorId: null,
        holdId: hold.id,
        kind: 'expire',
        onHandDelta: 0,
        reservedDelta: -hold.quantity,
        onHandAfter: state.onHand,
        reservedAfter: state.reserved,
        versionAfter: state.version,
        idempotencyKey: 'expiry:' + hold.id,
        fingerprint: 'automatic expiry',
        reason: 'Reservation expired at its persisted deadline.',
        requestId: this.entropy.id(),
        createdAt: now,
      };
    });
    await tx.expireHolds(
      expired.map((h) => h.id),
      now,
    );
    await tx.saveStock(stock.snapshot());
    await tx.addMovements(movements);
  }
  private replay(
    tx: InventoryWork,
    org: string,
    key: string,
    fingerprint: string,
  ) {
    return tx.movement(org, key).then((m) => {
      if (m && m.fingerprint !== fingerprint)
        throw new ApplicationError(
          'CONFLICT',
          'The idempotency key was already used with a different request.',
        );
      return m;
    });
  }
  change(c: StockCommand) {
    return this.repository.run(async (tx) => {
      const { stock, variant } = await this.locked(tx, c.actorId, c.variantId);
      const fingerprint = JSON.stringify({
        variantId: c.variantId,
        kind: c.kind,
        quantity: c.quantity,
        expectedVersion: c.expectedVersion,
        reason: administrativeReason(c.reason),
      });
      const old = await this.replay(
        tx,
        variant.organizationId,
        c.idempotencyKey,
        fingerprint,
      );
      if (old) return { stock: stock.snapshot(), movement: old };
      if (!variant.active)
        throw new ApplicationError(
          'CONFLICT',
          'An active variant/product is required.',
        );
      stock.expect(c.expectedVersion);
      if (
        !Number.isInteger(c.quantity) ||
        Math.abs(c.quantity) > 1000000 ||
        c.quantity === 0 ||
        (c.kind !== 'adjustment' && c.quantity < 0)
      )
        throw new ApplicationError(
          'INVALID_INPUT',
          'Use an integer quantity of at most one million units.',
        );
      const delta = c.kind === 'issue' ? -c.quantity : c.quantity;
      const movement = await this.record(
        tx,
        stock,
        variant,
        c.actorId,
        c.kind,
        delta,
        0,
        c.idempotencyKey,
        fingerprint,
        c.reason,
        c.requestId,
      );
      return { stock: stock.snapshot(), movement };
    });
  }
  reserve(c: HoldCommand) {
    return this.repository.run(async (tx) => {
      const { stock, variant } = await this.locked(tx, c.actorId, c.variantId);
      const fingerprint = JSON.stringify({
        variantId: c.variantId,
        quantity: c.quantity,
        expiresAt: c.expiresAt.toISOString(),
        referenceId: c.referenceId,
        expectedVersion: c.expectedVersion,
        reason: administrativeReason(c.reason),
      });
      const old = await this.replay(
        tx,
        variant.organizationId,
        c.idempotencyKey,
        fingerprint,
      );
      if (old) {
        const hold = await tx.hold(old.holdId!);
        return { stock: stock.snapshot(), hold: hold! };
      }
      if (!variant.published)
        throw new ApplicationError(
          'CONFLICT',
          'Only currently published variants can be reserved.',
        );
      stock.expect(c.expectedVersion);
      if ((await tx.holds(variant.id)).length >= 1000)
        throw new ApplicationError(
          'CONFLICT',
          'The active reservation limit is reached.',
        );
      const hold = Hold.create(
        this.entropy.id(),
        variant.id,
        variant.organizationId,
        c.referenceId,
        c.quantity,
        c.expiresAt,
        this.clock.now(),
      );
      await tx.saveHold(hold);
      await this.record(
        tx,
        stock,
        variant,
        c.actorId,
        'hold',
        0,
        c.quantity,
        c.idempotencyKey,
        fingerprint,
        c.reason,
        c.requestId,
        hold.id,
      );
      return { stock: stock.snapshot(), hold };
    });
  }
  decide(c: HoldDecisionCommand) {
    return this.repository.run(async (tx) => {
      const initial = await tx.hold(c.holdId);
      if (!initial)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Reservation was not found.',
        );
      const { stock, variant } = await this.locked(
        tx,
        c.actorId,
        initial.variantId,
      );
      const fingerprint = JSON.stringify({
        holdId: c.holdId,
        kind: c.kind,
        expectedVersion: c.expectedVersion,
        reason: administrativeReason(c.reason),
      });
      const old = await this.replay(
        tx,
        variant.organizationId,
        c.idempotencyKey,
        fingerprint,
      );
      const current = (await tx.hold(c.holdId))!;
      if (old) return { stock: stock.snapshot(), hold: current };
      if (current.orderId)
        throw new ApplicationError(
          'CONFLICT',
          'Order reservations can only be changed through the order workflow.',
        );
      stock.expect(c.expectedVersion);
      if (c.kind === 'consume' && !variant.published)
        throw new ApplicationError(
          'CONFLICT',
          'An available published variant is required to consume a hold.',
        );
      const hold = Hold.close(
        current,
        c.kind === 'consume' ? 'consumed' : 'released',
        this.clock.now(),
      );
      await tx.saveHold(hold);
      await this.record(
        tx,
        stock,
        variant,
        c.actorId,
        c.kind,
        c.kind === 'consume' ? -hold.quantity : 0,
        -hold.quantity,
        c.idempotencyKey,
        fingerprint,
        c.reason,
        c.requestId,
        hold.id,
      );
      return { stock: stock.snapshot(), hold };
    });
  }
  get(query: StockQuery) {
    return this.repository.run(async (tx) => {
      const { stock } = await this.locked(tx, query.actorId, query.variantId);
      return stock.snapshot();
    });
  }
  movements(query: StockQuery) {
    return this.repository.run(async (tx) => {
      await this.locked(tx, query.actorId, query.variantId);
      return tx.movements(query.variantId, query.page, query.limit);
    });
  }
  hold(actorId: string, id: string) {
    return this.repository.run(async (tx) => {
      const initial = await tx.hold(id);
      if (!initial)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Reservation was not found.',
        );
      await this.locked(tx, actorId, initial.variantId);
      return (await tx.hold(id))!;
    });
  }
  availability(ids: string[]) {
    if (ids.length > 50)
      throw new ApplicationError(
        'INVALID_INPUT',
        'At most fifty variants per availability request.',
      );
    return this.repository.run(async (tx) => {
      const variants = (await this.catalog.variants(ids)).filter(
        (v) => v.published,
      );
      const quantities = await tx.availability(
        variants.map((v) => v.id),
        this.clock.now(),
      );
      const available = new Map(
        quantities.map((row) => [row.variantId, row.available]),
      );
      return variants.map((v) => ({
        variantId: v.id,
        available: available.get(v.id) ?? 0,
      }));
    });
  }
  private async orderLocks(tx: InventoryWork, c: OrderStockContext) {
    await tx.lock(`organization:${c.organizationId}`);
    const variants = await this.catalog.variants(
      c.lines.map((l) => l.variantId),
    );
    if (
      variants.length !== c.lines.length ||
      variants.some((v) => v.organizationId !== c.organizationId)
    )
      throw new ApplicationError(
        'CONFLICT',
        'Order stock context does not match catalog ownership.',
      );
    for (const id of [...new Set(variants.map((v) => v.productId))].sort())
      await tx.lock(`product:${id}`);
    await tx.lock('catalog:categories');
    for (const id of c.lines.map((l) => l.variantId).sort())
      await tx.lock(`stock:${id}`);
    return variants;
  }
  reserveOrder(c: OrderStockContext, requestId: string) {
    return this.repository.run(async (tx) => {
      const variants = await this.orderLocks(tx, c);
      const current = await this.catalog.variants(
        c.lines.map((l) => l.variantId),
      );
      if (current.some((v) => !v.published))
        throw new ApplicationError(
          'CONFLICT',
          'An order variant is no longer purchasable.',
        );
      for (const line of c.lines) {
        const variant = variants.find((v) => v.id === line.variantId)!;
        const stock = Stock.restore(
          (await tx.stock(line.variantId)) ??
            Stock.empty(line.variantId, this.clock.now()).snapshot(),
        );
        await this.expire(tx, stock, variant);
        if ((await tx.holds(line.variantId)).length >= 1000)
          throw new ApplicationError(
            'CONFLICT',
            'Active reservation limit is reached.',
          );
        const hold = {
          ...Hold.create(
            line.holdId,
            line.variantId,
            c.organizationId,
            c.orderId,
            line.quantity,
            c.expiresAt,
            this.clock.now(),
          ),
          orderId: c.orderId,
        };
        await tx.saveHold(hold);
        await this.record(
          tx,
          stock,
          variant,
          c.buyerId,
          'hold',
          0,
          line.quantity,
          'order:reserve:' + hold.id,
          c.orderId,
          'Stock reserved for a confirmed unpaid customer order.',
          requestId,
          hold.id,
        );
      }
    });
  }
  closeOrder(
    c: OrderStockContext,
    kind: 'release' | 'consume',
    actorId: string | null,
    requestId: string,
  ) {
    return this.repository.run(async (tx) => {
      const variants = await this.orderLocks(tx, c);
      for (const line of c.lines) {
        const variant = variants.find((v) => v.id === line.variantId)!;
        const row = await tx.stock(line.variantId);
        if (!row)
          throw new ApplicationError(
            'CONFLICT',
            'Order stock balance is missing.',
          );
        const stock = Stock.restore(row);
        await this.expire(tx, stock, variant);
        const hold = await tx.hold(line.holdId);
        if (
          !hold ||
          hold.orderId !== c.orderId ||
          hold.quantity !== line.quantity ||
          hold.variantId !== line.variantId
        )
          throw new ApplicationError(
            'CONFLICT',
            'Order reservation does not match the persisted order.',
          );
        if (
          kind === 'release' &&
          (hold.status === 'released' || hold.status === 'expired')
        )
          continue;
        const closed = Hold.close(
          hold,
          kind === 'consume' ? 'consumed' : 'released',
          this.clock.now(),
        );
        await tx.saveHold(closed);
        await this.record(
          tx,
          stock,
          variant,
          actorId,
          kind,
          kind === 'consume' ? -hold.quantity : 0,
          -hold.quantity,
          'order:' + kind + ':' + hold.id,
          c.orderId,
          kind === 'consume'
            ? 'Order payment confirmed; reserved units consumed.'
            : 'Unpaid order closed; reserved units released.',
          requestId,
          hold.id,
        );
      }
    });
  }
  async expireDue() {
    const ids = await this.repository.run((tx) =>
      tx.expiredVariants(this.clock.now()),
    );
    for (const id of ids)
      await this.repository.run(async (tx) => {
        const variant = await this.identity(id);
        await tx.lock(`organization:${variant.organizationId}`);
        await tx.lock(`product:${variant.productId}`);
        await tx.lock(`stock:${id}`);
        const stock = await tx.stock(id);
        if (stock) await this.expire(tx, Stock.restore(stock), variant);
      });
  }
}
