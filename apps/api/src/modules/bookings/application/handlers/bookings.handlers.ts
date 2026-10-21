import type { VeterinaryEligibility } from '../../../veterinary/application/ports/in/veterinary-eligibility';
import { ApplicationError } from '../../../../shared/domain/application-error';
import { administrativeReason } from '../../../../shared/domain/authorization';
import { availableCapacity } from '../../../../shared/domain/scheduling';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { Authorization } from '../../../authorization/application/ports/in/authorization';
import type { ServicesBooking } from '../../../services/application/ports/in/services-booking';
import type { AnimalsBooking } from '../../../animals/application/ports/in/animals-booking';
import type { UsersDirectory } from '../../../users/application/ports/out/users-directory';
import type { BookingNotifications } from '../../../notifications/application/ports/in/booking-notifications';
import type { BookingOccupancy } from '../ports/in/booking-occupancy';
import type {
  BookingsRepository,
  BookingsWork,
} from '../ports/out/bookings-repository';
import type { BookingsUseCases } from '../ports/in/bookings-use-cases';
import type { BookingState, BookingAcceptance } from '../results/booking';
import type {
  CreateBookingCommand,
  BookingActionCommand,
  RescheduleBookingCommand,
  BookingSelection,
} from '../commands/booking.commands';
import type { BookingsQuery } from '../queries/booking.queries';
import { Booking, bookingInterval } from '../../domain/aggregates/booking';
export class BookingsHandlers implements BookingsUseCases {
  constructor(
    private readonly repo: BookingsRepository,
    private readonly auth: Authorization,
    private readonly services: ServicesBooking,
    private readonly animals: AnimalsBooking,
    private readonly users: UsersDirectory,
    private readonly busy: BookingOccupancy,
    private readonly mail: BookingNotifications,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
    private readonly veterinary?: VeterinaryEligibility,
  ) {}
  private async load(tx: BookingsWork, id: string) {
    const s = await tx.find(id);
    if (!s)
      throw new ApplicationError(
        'RESOURCE_NOT_FOUND',
        'Booking was not found.',
      );
    return s;
  }
  private async access(actor: string, s: BookingState, provider: boolean) {
    if (provider)
      await this.auth.requirePermission(
        actor,
        'bookings.manage',
        s.organizationId,
      );
    else {
      await this.auth.requirePermission(actor, 'bookings.self.manage');
      if (s.buyerId !== actor)
        throw new ApplicationError(
          'FORBIDDEN',
          'Booking ownership is required.',
        );
    }
  }
  private async record(
    tx: BookingsWork,
    s: BookingState,
    actor: string | null,
    action: string,
    reason: string,
    requestId: string,
  ) {
    await tx.save(s);
    await tx.audit({
      id: this.entropy.id(),
      bookingId: s.id,
      actorId: actor,
      action,
      version: s.version,
      snapshot: s,
      reason,
      requestId,
      createdAt: this.clock.now(),
    });
    const u = await this.users.findById(s.buyerId);
    if (u?.status === 'active' && u.emailVerifiedAt)
      await this.mail.replace({
        bookingId: s.id,
        version: s.version,
        userId: u.id,
        to: u.email,
        serviceName: s.acceptance.service.name,
        organizationName: s.acceptance.organizationName,
        status: s.status,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        totalMinor: s.acceptance.totalMinor,
        now: this.clock.now(),
      });
    else await this.mail.cancel(s.id);
  }
  private async selection(
    tx: BookingsWork,
    actor: string,
    serviceId: string,
    animalId: string,
    d: BookingSelection,
    exclude?: string,
  ) {
    const now = this.clock.now();
    const {
      service: s,
      resource: r,
      organizationName,
      professionalVerifiedUntil,
    } = await this.services.offer(
      serviceId,
      d.resourceId,
      d.expectedServiceVersion,
      d.expectedResourceVersion,
    );
    const pet = await this.animals.forBooking(actor, animalId);
    if (!s.acceptedSpecies.includes(pet.species))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Service does not accept this pet species.',
      );
    if (
      d.consent !== true ||
      !d.contact.name.trim() ||
      d.contact.name.length > 100 ||
      !/^[+][1-9][0-9]{7,14}$/.test(d.contact.phone)
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Explicit terms/contact-sharing consent and valid contact are required.',
      );
    const interval = bookingInterval(s, d.slot, r, now);
    if (interval.totalMinor !== d.expectedTotalMinor)
      throw new ApplicationError(
        'CONFLICT',
        'Review the current booking total before accepting.',
      );
    if (
      professionalVerifiedUntil &&
      interval.endsAt >= professionalVerifiedUntil
    )
      throw new ApplicationError(
        'CONFLICT',
        'Professional verification must cover the appointment end.',
      );
    const occupied = {
      startsAt: interval.occupiedStartsAt,
      endsAt: interval.occupiedEndsAt,
    };
    const ranges = (
      await this.busy.range(r.id, occupied.startsAt, occupied.endsAt, now)
    ).filter((b) => b.id !== exclude);
    if (
      !availableCapacity(
        r.capacity,
        occupied,
        ranges,
        await this.services.blocks(r.id, occupied.startsAt, occupied.endsAt),
      )
    )
      throw new ApplicationError(
        'CONFLICT',
        'The requested resource interval is no longer available.',
      );
    if (
      await tx.petOverlap(
        animalId,
        occupied.startsAt,
        occupied.endsAt,
        now,
        exclude,
      )
    )
      throw new ApplicationError(
        'CONFLICT',
        'This pet already has an overlapping reservation.',
      );
    const {
      name,
      kind,
      priceMinor,
      currency,
      collectionMode,
      confirmationMode,
      durationMinutes,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      checkInMinute,
      checkOutMinute,
      minNights,
      maxNights,
      minimumNoticeMinutes,
      cancellationCutoffMinutes,
      requestTtlMinutes,
      requirements,
      terms,
      version,
    } = s;
    const acceptance: BookingAcceptance = {
      service: {
        category: s.category,
        veterinaryCredentialId: s.veterinaryCredentialId ?? null,
        name,
        kind,
        priceMinor,
        currency,
        collectionMode,
        confirmationMode,
        durationMinutes,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        checkInMinute,
        checkOutMinute,
        minNights,
        maxNights,
        minimumNoticeMinutes,
        cancellationCutoffMinutes,
        requestTtlMinutes,
        requirements,
        terms,
        version,
      },
      resource: { id: r.id, name: r.name, version: r.version },
      organizationName,
      pet,
      contact: { name: d.contact.name.trim(), phone: d.contact.phone },
      consent: true,
      acceptedAt: now,
      timeZone: 'America/Bogota',
      totalMinor: interval.totalMinor,
      nights: interval.nights,
      slot: structuredClone(d.slot),
    };
    return {
      resourceId: r.id,
      organizationId: s.organizationId,
      startsAt: interval.startsAt,
      endsAt: interval.endsAt,
      occupiedStartsAt: interval.occupiedStartsAt,
      occupiedEndsAt: interval.occupiedEndsAt,
      acceptance,
      status:
        confirmationMode === 'automatic'
          ? ('confirmed' as const)
          : ('requested' as const),
      expiresAt:
        confirmationMode === 'manual'
          ? new Date(
              Math.min(+now + requestTtlMinutes * 60000, +interval.startsAt),
            )
          : null,
    };
  }
  create(c: CreateBookingCommand) {
    return this.repo.run(async (tx) => {
      await tx.lock(`user:${c.actorId}`);
      await this.auth.requirePermission(c.actorId, 'bookings.self.manage');
      await tx.lock(`booking-key:${c.actorId}:${c.idempotencyKey}`);
      const fingerprint = this.entropy.digest(
        JSON.stringify({
          serviceId: c.serviceId,
          animalId: c.animalId,
          selection: c.selection,
        }),
      );
      const replay = await tx.replay(c.actorId, c.idempotencyKey);
      if (replay) {
        if (replay.fingerprint !== fingerprint)
          throw new ApplicationError(
            'CONFLICT',
            'Idempotency key was already used for a different booking.',
          );
        return replay;
      }
      const service = await this.services.inspect(c.serviceId);
      if (!service)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Service was not found.',
        );
      await tx.lock(`organization:${service.organizationId}`);
      await tx.lock(`resource:${c.selection.resourceId}`);
      const offer = await this.selection(
        tx,
        c.actorId,
        c.serviceId,
        c.animalId,
        c.selection,
      );
      const now = this.clock.now();
      const s: BookingState = {
        id: this.entropy.id(),
        buyerId: c.actorId,
        animalId: c.animalId,
        serviceId: c.serviceId,
        idempotencyKey: c.idempotencyKey,
        fingerprint,
        ...offer,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      await this.record(
        tx,
        s,
        c.actorId,
        'created',
        'Customer accepted service terms and contact sharing.',
        c.requestId,
      );
      return s;
    });
  }
  private async locked(
    tx: BookingsWork,
    actor: string,
    id: string,
    provider: boolean,
    extraResource?: string,
  ) {
    await tx.lock(`user:${actor}`);
    const initial = await this.load(tx, id);
    await tx.lock(`organization:${initial.organizationId}`);
    const current = await this.load(tx, id);
    for (const resource of [
      ...new Set([
        current.resourceId,
        ...(extraResource ? [extraResource] : []),
      ]),
    ].sort())
      await tx.lock(`resource:${resource}`);
    await tx.lock(`booking:${id}`);
    const s = await this.load(tx, id);
    await this.access(actor, s, provider);
    return s;
  }
  action(c: BookingActionCommand) {
    return this.repo.run(async (tx) => {
      const s = await this.locked(tx, c.actorId, c.id, c.provider);
      const a = Booking.restore(s);
      a.expect(c.expectedVersion);
      if (a.expire(this.clock.now())) {
        const expired = a.snapshot();
        await this.record(
          tx,
          expired,
          null,
          'expired',
          'Pending business confirmation deadline elapsed.',
          c.requestId,
        );
        return expired;
      }
      if (
        s.acceptance.service.category === 'veterinary' &&
        ['confirm', 'start'].includes(c.action)
      ) {
        const credentialId = s.acceptance.service.veterinaryCredentialId;
        if (!this.veterinary || !credentialId)
          throw new ApplicationError(
            'CONFLICT',
            'Clinical verification is unavailable.',
          );
        await this.veterinary.eligible(
          credentialId,
          s.organizationId,
          s.resourceId,
          new Date(Math.max(+this.clock.now(), +s.endsAt)),
        );
      }
      a.transition(c.action, c.provider, this.clock.now());
      const next = a.snapshot();
      await this.record(
        tx,
        next,
        c.actorId,
        c.action,
        administrativeReason(c.reason),
        c.requestId,
      );
      return next;
    });
  }
  reschedule(c: RescheduleBookingCommand) {
    return this.repo.run(async (tx) => {
      const s = await this.locked(
        tx,
        c.actorId,
        c.id,
        false,
        c.selection.resourceId,
      );
      const a = Booking.restore(s);
      a.expect(c.expectedVersion);
      a.cancellable(this.clock.now());
      if (
        s.status === 'requested' &&
        s.expiresAt &&
        s.expiresAt <= this.clock.now()
      )
        throw new ApplicationError('CONFLICT', 'Pending request expired.');
      const offer = await this.selection(
        tx,
        c.actorId,
        s.serviceId,
        s.animalId,
        c.selection,
        s.id,
      );
      a.reschedule(offer, this.clock.now());
      const next = a.snapshot();
      await this.record(
        tx,
        next,
        c.actorId,
        'rescheduled',
        administrativeReason(c.reason),
        c.requestId,
      );
      return next;
    });
  }
  get(actor: string, id: string, provider = false) {
    return this.repo.run(async (tx) => {
      const s = await this.locked(tx, actor, id, provider);
      const a = Booking.restore(s);
      if (a.expire(this.clock.now()))
        await this.record(
          tx,
          a.snapshot(),
          null,
          'expired',
          'Pending business confirmation deadline elapsed.',
          'booking-expiry-read',
        );
      return a.snapshot();
    });
  }
  list(q: BookingsQuery) {
    return this.repo.run(async (tx) => {
      if (q.organizationId)
        await this.auth.requirePermission(
          q.actorId,
          'bookings.manage',
          q.organizationId,
        );
      else await this.auth.requirePermission(q.actorId, 'bookings.self.manage');
      return tx.list(q);
    });
  }
  history(
    actor: string,
    id: string,
    page: number,
    limit: number,
    provider = false,
  ) {
    return this.repo.run(async (tx) => {
      await this.access(actor, await this.load(tx, id), provider);
      return tx.audits(id, page, limit);
    });
  }
  async expireDue() {
    const due = await this.repo.run((tx) => tx.due(this.clock.now(), 100));
    let count = 0;
    for (const initial of due)
      await this.repo.run(async (tx) => {
        await tx.lock(`organization:${initial.organizationId}`);
        await tx.lock(`resource:${initial.resourceId}`);
        await tx.lock(`booking:${initial.id}`);
        const s = await tx.find(initial.id);
        if (!s) return;
        const a = Booking.restore(s);
        if (a.expire(this.clock.now())) {
          await this.record(
            tx,
            a.snapshot(),
            null,
            'expired',
            'Pending business confirmation deadline elapsed.',
            'booking-expiry-scheduler',
          );
          count++;
        }
      });
    return count;
  }
}
