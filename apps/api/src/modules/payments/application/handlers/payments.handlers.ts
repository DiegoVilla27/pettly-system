import { ApplicationError } from '../../../../shared/domain/application-error';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { Authorization } from '../../../authorization/application/ports/in/authorization';
import type { OrderPayments } from '../../../orders/application/ports/in/order-payments';
import type { OrganizationAccess } from '../../../organizations/application/ports/in/organization-access';
import { Payment } from '../../domain/aggregates/payment';
import type {
  PaymentsRepository,
  PaymentsWork,
} from '../ports/out/payments-repository';
import type { PaymentProvider } from '../ports/out/payment-provider';
import type { CommissionPolicy } from '../ports/in/commission-policy';
import type { PaymentsUseCases } from '../ports/in/payments-use-cases';
import type {
  CreatePaymentCommand,
  ReconcilePaymentCommand,
} from '../commands/payment.commands';
import type { PaymentQuery, PaymentsQuery } from '../queries/payment.queries';
import type {
  PaymentState,
  PaymentJob,
  ProviderObservation,
} from '../results/payment';
export class PaymentsHandlers implements PaymentsUseCases {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly orders: OrderPayments,
    private readonly auth: Authorization,
    private readonly provider: PaymentProvider,
    private readonly commission: CommissionPolicy,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
    private readonly organizations: OrganizationAccess,
  ) {}
  private missing(): never {
    throw new ApplicationError('RESOURCE_NOT_FOUND', 'Payment was not found.');
  }
  private conflict(message: string): never {
    throw new ApplicationError('CONFLICT', message);
  }
  private async actor(tx: PaymentsWork, id: string) {
    await tx.lock(`user:${id}`);
    await this.auth.requirePermission(id, 'payments.self.manage');
  }
  private async load(tx: PaymentsWork, id: string) {
    const first = await tx.payment(id);
    if (!first) this.missing();
    await this.orders.inspect(first.orderId); // Consistent organization → order → payment lock ordering.
    await tx.lock(`payment-order:${first.orderId}`);
    const state = await tx.payment(id);
    if (!state) this.missing();
    return Payment.restore(state);
  }
  private async visible(actor: string, p: PaymentState) {
    if (actor !== p.buyerId)
      await this.auth.requirePermission(
        actor,
        'payments.business.read',
        p.organizationId,
      );
  }
  private async persist(
    tx: PaymentsWork,
    p: Payment,
    actor: string | null,
    requestId: string,
  ) {
    const state = p.snapshot();
    await tx.save(state);
    await tx.audit({
      id: this.entropy.id(),
      paymentId: state.id,
      version: state.version,
      action: state.status,
      actorId: actor,
      requestId,
      createdAt: this.clock.now(),
    });
    return state;
  }
  private async enqueue(
    tx: PaymentsWork,
    id: string,
    kind: PaymentJob['kind'],
  ) {
    const now = this.clock.now(),
      existing = await tx.jobFor(id, kind);
    if (existing) {
      if (existing.leaseUntil && existing.leaseUntil > now) return;
      await tx.saveJob({
        ...existing,
        status: 'queued',
        nextAt: now,
        lastError: null,
        updatedAt: now,
      });
    } else
      await tx.saveJob({
        id: this.entropy.id(),
        paymentId: id,
        kind,
        status: 'queued',
        attempts: 0,
        nextAt: now,
        leaseId: null,
        leaseUntil: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      });
  }
  create(c: CreatePaymentCommand) {
    return this.repo.run(async (tx) => {
      await this.actor(tx, c.actorId);
      const order = await this.orders.forPayment(c.actorId, c.orderId);
      await tx.lock(`payment-order:${order.id}`);
      const replay = await tx.replay(c.actorId, c.idempotencyKey);
      if (replay) {
        if (replay.orderId !== c.orderId)
          this.conflict('Idempotency key belongs to a different order.');
        return replay;
      }
      const business = await this.organizations.findOrganization(
        order.organizationId,
      );
      if (
        !business ||
        business.status !== 'active' ||
        business.type !== 'business' ||
        business.countryCode !== 'CO'
      )
        this.conflict(
          'New payment attempts require an active Colombian business.',
        );
      if (
        order.status !== 'awaiting_payment' ||
        order.expiresAt <= this.clock.now()
      )
        this.conflict('Payment requires a live unpaid order.');
      if (
        order.currency !== 'COP' ||
        order.snapshot.contact.countryCode !== 'CO' ||
        !order.snapshot.commission
      )
        this.conflict(
          'Payment requires a Colombian COP order with accepted commission terms. Historical orders need a new checkout.',
        );
      if (await tx.active(order.id))
        this.conflict(
          'An unresolved or approved payment already exists for this order. Reuse or reconcile it before retrying.',
        );
      const now = this.clock.now(),
        p = Payment.create({
          id: this.entropy.id(),
          orderId: order.id,
          buyerId: order.buyerId,
          organizationId: order.organizationId,
          idempotencyKey: c.idempotencyKey,
          provider: this.provider.name,
          reference: null,
          checkoutUrl: null,
          status: 'created',
          distributionStatus: 'unconfirmed',
          allocation: order.snapshot.commission,
          amountMinor: order.totalMinor,
          currency: 'COP',
          feeMinor: null,
          version: 1,
          expiresAt: order.expiresAt,
          createdAt: now,
          updatedAt: now,
        });
      const result = await this.persist(tx, p, c.actorId, c.requestId);
      await this.enqueue(tx, result.id, 'checkout');
      return result;
    });
  }
  get(q: PaymentQuery) {
    return this.repo.run(async (tx) => {
      await this.actor(tx, q.actorId);
      const p = await this.load(tx, q.paymentId);
      await this.visible(q.actorId, p.snapshot());
      return p.snapshot();
    });
  }
  list(q: PaymentsQuery) {
    return this.repo.run(async (tx) => {
      await this.actor(tx, q.actorId);
      if (q.platform)
        await this.auth.requirePermission(
          q.actorId,
          'payments.platform.manage',
        );
      if (q.organizationId) {
        await tx.lock(`organization:${q.organizationId}`);
        await this.auth.requirePermission(
          q.actorId,
          'payments.business.read',
          q.organizationId,
        );
      }
      return tx.list(q);
    });
  }
  history(q: PaymentQuery, page: number, limit: number) {
    return this.repo.run(async (tx) => {
      await this.actor(tx, q.actorId);
      const p = await this.load(tx, q.paymentId);
      await this.visible(q.actorId, p.snapshot());
      return tx.history(q.paymentId, page, limit);
    });
  }
  financials(q: PaymentQuery) {
    return this.repo.run(async (tx) => {
      await this.actor(tx, q.actorId);
      const p = await this.load(tx, q.paymentId);
      await this.auth.requirePermission(q.actorId, 'payments.platform.manage');
      void p;
      return tx.financials(q.paymentId);
    });
  }
  reconcile(c: ReconcilePaymentCommand) {
    return this.repo.run(async (tx) => {
      await this.actor(tx, c.actorId);
      await this.auth.requirePermission(c.actorId, 'payments.platform.manage');
      const p = await this.load(tx, c.paymentId);
      if (
        !this.provider.enabled ||
        p.snapshot().provider !== this.provider.name
      )
        throw new ApplicationError(
          'DEPENDENCY_UNAVAILABLE',
          'The payment provider is not configured for this attempt.',
        );
      await this.enqueue(tx, c.paymentId, 'reconcile');
      await tx.audit({
        id: this.entropy.id(),
        paymentId: c.paymentId,
        version: p.snapshot().version,
        action: 'reconciliation_requested',
        actorId: c.actorId,
        requestId: c.requestId,
        createdAt: this.clock.now(),
      });
      return p.snapshot();
    });
  }
  async policy(actorId: string) {
    await this.auth.requirePermission(actorId, 'payments.self.manage');
    const rate = this.commission.basisPoints();
    return {
      rateBasisPoints: rate,
      percent: rate / 100,
      base: 'product_subtotal' as const,
      processingFeeBearer: 'seller' as const,
      provider: this.provider.name,
      providerEnabled: this.provider.enabled,
    };
  }
  private async claim(id: string) {
    return this.repo.run(async (tx) => {
      await tx.lock(`payment-job:${id}`);
      const j = await tx.job(id),
        now = this.clock.now();
      if (
        !j ||
        j.status === 'done' ||
        j.nextAt > now ||
        (j.leaseUntil && j.leaseUntil > now)
      )
        return null;
      const claim = {
        ...j,
        attempts: j.attempts + 1,
        leaseId: this.entropy.id(),
        leaseUntil: new Date(+now + 60000),
        updatedAt: now,
      };
      await tx.saveJob(claim);
      return claim;
    });
  }
  private async finish(
    tx: PaymentsWork,
    claim: PaymentJob,
    done: boolean,
    nextAt?: Date,
    error: string | null = null,
  ) {
    await tx.lock(`payment-job:${claim.id}`);
    const j = await tx.job(claim.id);
    if (!j || j.leaseId !== claim.leaseId)
      this.conflict(
        'Payment job lease was replaced. Reconciliation will recover the result.',
      );
    await tx.saveJob({
      ...j,
      status: done ? 'done' : 'retry',
      nextAt: nextAt ?? this.clock.now(),
      leaseId: null,
      leaseUntil: null,
      lastError: error,
      updatedAt: this.clock.now(),
    });
  }
  private async currentClaim(tx: PaymentsWork, claim: PaymentJob) {
    await tx.lock(`payment-job:${claim.id}`);
    const j = await tx.job(claim.id);
    if (j?.leaseId !== claim.leaseId)
      this.conflict('Payment job lease was replaced.');
  }
  private async apply(claim: PaymentJob, o: ProviderObservation) {
    return this.repo.run(async (tx) => {
      const payment = await this.load(tx, claim.paymentId),
        s = payment.snapshot();
      await this.currentClaim(tx, claim);
      await tx.lock(`provider-event:${s.provider}:${o.eventId}`);
      const fingerprint = this.entropy.digest(
        JSON.stringify({
          paymentId: o.paymentId,
          reference: o.reference,
          amountMinor: o.amountMinor,
          currency: o.currency,
          status: o.status,
          distributionStatus: o.distributionStatus,
          feeMinor: o.feeMinor,
        }),
      );
      const existing = await tx.event(s.provider, o.eventId);
      if (existing) {
        if (existing.paymentId !== s.id || existing.fingerprint !== fingerprint)
          this.conflict(
            'Provider event identifier was reused with conflicting data.',
          );
        await this.finish(
          tx,
          claim,
          s.status !== 'pending' &&
            !(
              s.status === 'approved' && s.distributionStatus !== 'distributed'
            ),
          new Date(+this.clock.now() + 30000),
        );
        return;
      }
      const order = await this.orders.inspect(s.orderId);
      const exact =
        o.paymentId === s.id &&
        o.amountMinor === s.amountMinor &&
        o.currency === s.currency &&
        (!s.reference || s.reference === o.reference);
      const active = await tx.active(s.orderId);
      const accepted =
        exact &&
        (order.paymentId === s.id ||
          (order.status === 'awaiting_payment' &&
            order.expiresAt > this.clock.now() &&
            (!active || active.id === s.id)));
      // Validate observation before any cross-module side effects.
      const outcome = payment.observe(o, accepted, this.clock.now());
      if (exact && o.status === 'approved' && accepted)
        await this.orders.settleVerified(
          s.orderId,
          s.id,
          s.amountMinor,
          s.currency,
          this.entropy.id(),
        );
      const event = {
        id: this.entropy.id(),
        paymentId: s.id,
        provider: s.provider,
        eventId: o.eventId,
        fingerprint,
        observation: o,
        outcome,
        createdAt: this.clock.now(),
      };
      await tx.saveEvent(event);
      if (exact && o.status === 'approved' && !(await tx.capture(s.id)))
        await tx.saveLedger({
          id: this.entropy.id(),
          paymentId: s.id,
          eventId: event.id,
          kind: 'capture',
          amountMinor: s.amountMinor,
          platformMinor: s.allocation.platformMinor,
          sellerMinor: s.allocation.sellerMinor,
          createdAt: this.clock.now(),
        });
      if (payment.snapshot().version !== s.version)
        await this.persist(tx, payment, null, this.entropy.id());
      const after = payment.snapshot();
      const poll =
        after.status === 'pending' ||
        (after.status === 'approved' &&
          after.distributionStatus !== 'distributed');
      await this.finish(tx, claim, !poll, new Date(+this.clock.now() + 30000));
    });
  }
  private async process(claim: PaymentJob) {
    const prepared = await this.repo.run(async (tx) => {
      const p = await this.load(tx, claim.paymentId),
        before = p.snapshot();
      await this.currentClaim(tx, claim);
      const order = await this.orders.inspect(before.orderId);
      if (claim.kind === 'checkout' && before.status === 'created') {
        if (!p.expire(this.clock.now()) && order.status !== 'awaiting_payment')
          p.abandon(this.clock.now());
        if (p.snapshot().version !== before.version) {
          await this.persist(tx, p, null, this.entropy.id());
          await this.finish(tx, claim, true);
          return null;
        }
      }
      if (!this.provider.enabled || before.provider !== this.provider.name) {
        await this.finish(
          tx,
          claim,
          false,
          before.status === 'created'
            ? before.expiresAt
            : new Date(+this.clock.now() + 60000),
          'PROVIDER_NOT_CONFIGURED',
        );
        return null;
      }
      if (claim.kind === 'checkout' && before.status === 'created') {
        p.processing(this.clock.now());
        await this.persist(tx, p, null, this.entropy.id());
        return { state: p.snapshot(), create: true };
      }
      return { state: p.snapshot(), create: false };
    });
    if (!prepared) return;
    // All provider calls happen after committing the preparation transaction.
    if (prepared.create) {
      const session = await this.provider.createCheckout(prepared.state);
      await this.repo.run(async (tx) => {
        const p = await this.load(tx, claim.paymentId);
        await this.currentClaim(tx, claim);
        p.session(session.reference, session.url, this.clock.now());
        await this.persist(tx, p, null, this.entropy.id());
        await this.finish(tx, claim, true);
        await this.enqueue(tx, claim.paymentId, 'reconcile');
      });
    } else await this.apply(claim, await this.provider.lookup(prepared.state));
  }
  async runDue() {
    const due = await this.repo.run((tx) => tx.due(this.clock.now()));
    for (const job of due) {
      const claim = await this.claim(job.id);
      if (!claim) continue;
      try {
        await this.process(claim);
      } catch {
        // Persist only a safe category. Provider exceptions may contain credentials or PII.
        await this.repo.run(async (tx) => {
          const j = await tx.job(claim.id);
          if (j?.leaseId === claim.leaseId)
            await this.finish(
              tx,
              claim,
              false,
              new Date(
                +this.clock.now() +
                  Math.min(300000, 1000 * 2 ** Math.min(claim.attempts, 8)),
              ),
              'PROVIDER_OR_RECONCILIATION_FAILED',
            );
        });
      }
    }
  }
}
