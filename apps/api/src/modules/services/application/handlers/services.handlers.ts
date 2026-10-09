import type { VeterinaryEligibility } from '../../../veterinary/application/ports/in/veterinary-eligibility';
import { ApplicationError } from '../../../../shared/domain/application-error';
import { administrativeReason } from '../../../../shared/domain/authorization';
import {
  availableCapacity,
  civilDate,
  dayOfWeek,
  fitsCalendar,
  localDay,
  localInstant,
  nextDay,
  overlap,
  peakUsage,
} from '../../../../shared/domain/scheduling';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { Authorization } from '../../../authorization/application/ports/in/authorization';
import type { OrganizationAccess } from '../../../organizations/application/ports/in/organization-access';
import type { BookingOccupancy } from '../../../bookings/application/ports/in/booking-occupancy';
import { Service, validateResource } from '../../domain/aggregates/service';
import type { ServiceState, ResourceState } from '../results/service';
import type {
  ServicesRepository,
  ServicesWork,
} from '../ports/out/services-repository';
import type { ServicesUseCases } from '../ports/in/services-use-cases';
import type {
  ConfigureServiceCommand,
  ConfigureResourceCommand,
  ServiceDecisionCommand,
  BlockCommand,
} from '../commands/service.commands';
import type {
  ServicesQuery,
  AvailabilityQuery,
} from '../queries/service.queries';
const missing = () =>
  new ApplicationError(
    'RESOURCE_NOT_FOUND',
    'Service or resource was not found.',
  );
export class ServicesHandlers implements ServicesUseCases {
  constructor(
    private readonly repo: ServicesRepository,
    private readonly auth: Authorization,
    private readonly orgs: OrganizationAccess,
    private readonly busy: BookingOccupancy,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
    private readonly veterinary?: VeterinaryEligibility,
  ) {}
  private async business(id: string) {
    const o = await this.orgs.findOrganization(id);
    if (
      !o ||
      o.status !== 'active' ||
      o.type !== 'business' ||
      o.countryCode !== 'CO'
    )
      throw new ApplicationError(
        'CONFLICT',
        'An active Colombian business is required.',
      );
    return o;
  }
  private async audit(
    tx: ServicesWork,
    actor: string,
    s: ServiceState | ResourceState,
    action: string,
    reason: string,
    requestId: string,
  ) {
    await tx.audit({
      id: this.entropy.id(),
      organizationId: s.organizationId,
      serviceId: 'priceMinor' in s ? s.id : null,
      resourceId: 'capacity' in s ? s.id : null,
      actorId: actor,
      action,
      version: s.version,
      snapshot: s,
      reason: administrativeReason(reason),
      requestId,
      createdAt: this.clock.now(),
    });
  }
  private async clinical(s: ServiceState, through = this.clock.now()) {
    if (s.category !== 'veterinary') return null;
    if (
      !this.veterinary ||
      !s.veterinaryCredentialId ||
      s.resourceIds.length !== 1
    )
      throw new ApplicationError(
        'CONFLICT',
        'Verified veterinary professional is required.',
      );
    return this.veterinary.eligible(
      s.veterinaryCredentialId,
      s.organizationId,
      s.resourceIds[0],
      through,
    );
  }
  private async assignments(tx: ServicesWork, s: ServiceState) {
    await this.clinical(s);
    for (const id of [...s.resourceIds].sort()) {
      await tx.lock(`resource:${id}`);
      const r = await tx.resource(id);
      if (
        !r ||
        r.organizationId !== s.organizationId ||
        r.kind !== s.kind ||
        r.status !== 'active' ||
        (s.category === 'veterinary' && r.capacity !== 1)
      )
        throw new ApplicationError(
          'CONFLICT',
          'Assigned resources must be active, belong to the business and match service kind.',
        );
    }
  }
  configure(c: ConfigureServiceCommand) {
    return this.repo.run(async (tx) => {
      await tx.lock(`user:${c.actorId}`);
      await tx.lock(`organization:${c.organizationId}`);
      await this.auth.requirePermission(
        c.actorId,
        'services.manage',
        c.organizationId,
      );
      await this.business(c.organizationId);
      let aggregate: Service;
      if (c.id) {
        await tx.lock(`service:${c.id}`);
        const s = await tx.service(c.id);
        if (!s || s.organizationId !== c.organizationId) throw missing();
        aggregate = Service.restore(s);
        aggregate.expect(c.expectedVersion);
        aggregate.configure(c.data, this.clock.now());
      } else
        aggregate = Service.create(
          this.entropy.id(),
          c.organizationId,
          c.actorId,
          c.data,
          this.clock.now(),
        );
      const s = aggregate.snapshot();
      await this.assignments(tx, s);
      await tx.saveService(s);
      await this.audit(
        tx,
        c.actorId,
        s,
        c.id ? 'updated' : 'created',
        c.reason,
        c.requestId,
      );
      return s;
    });
  }
  resource(c: ConfigureResourceCommand) {
    return this.repo.run(async (tx) => {
      await tx.lock(`user:${c.actorId}`);
      await tx.lock(`organization:${c.organizationId}`);
      await this.auth.requirePermission(
        c.actorId,
        'services.manage',
        c.organizationId,
      );
      await this.business(c.organizationId);
      const now = this.clock.now();
      const d = validateResource(c.data);
      let s: ResourceState;
      if (c.id) {
        await tx.lock(`resource:${c.id}`);
        const old = await tx.resource(c.id);
        if (!old || old.organizationId !== c.organizationId) throw missing();
        if (old.version !== c.expectedVersion || old.kind !== d.kind)
          throw new ApplicationError(
            'CONFLICT',
            'Resource version changed or kind is immutable.',
          );
        const occupied = await this.busy.range(
          old.id,
          now,
          new Date(+now + 210 * 86400000),
          now,
        );
        if (
          peakUsage(occupied) > d.capacity ||
          occupied.some((b) => !fitsCalendar(d, b))
        )
          throw new ApplicationError(
            'CONFLICT',
            'Capacity or calendar would invalidate an accepted booking.',
          );
        s = { ...old, ...d, version: old.version + 1, updatedAt: now };
      } else {
        if ((await tx.resources(c.organizationId)).length >= 100)
          throw new ApplicationError(
            'CONFLICT',
            'A business supports at most 100 resources.',
          );
        s = {
          ...d,
          id: this.entropy.id(),
          organizationId: c.organizationId,
          version: 1,
          createdAt: now,
          updatedAt: now,
        };
      }
      await tx.saveResource(s);
      await this.audit(
        tx,
        c.actorId,
        s,
        c.id ? 'resource_updated' : 'resource_created',
        c.reason,
        c.requestId,
      );
      return s;
    });
  }
  decision(c: ServiceDecisionCommand) {
    return this.repo.run(async (tx) => {
      await tx.lock(`user:${c.actorId}`);
      const initial = c.id ? await tx.service(c.id) : null;
      if (!initial) throw missing();
      await tx.lock(`organization:${initial.organizationId}`);
      await tx.lock(`service:${initial.id}`);
      const state = await tx.service(initial.id);
      if (!state) throw missing();
      const a = Service.restore(state);
      a.expect(c.expectedVersion);
      await this.business(state.organizationId);
      if (c.action === 'review') {
        await this.auth.requirePermission(
          c.actorId,
          'moderation.publications.review',
        );
        if (
          (await this.orgs.membershipsForUser(c.actorId)).some(
            (m) => m.organizationId === state.organizationId,
          )
        )
          throw new ApplicationError(
            'FORBIDDEN',
            'Members cannot review their own business.',
          );
        await this.assignments(tx, state);
        a.review(
          c.actorId,
          c.approved,
          administrativeReason(c.reason),
          this.clock.now(),
        );
      } else {
        await this.auth.requirePermission(
          c.actorId,
          'services.manage',
          state.organizationId,
        );
        if (c.action === 'submit') {
          await this.assignments(tx, state);
          a.submit(this.clock.now());
        } else
          a.close(
            c.action === 'pause' ? 'paused' : 'archived',
            this.clock.now(),
          );
      }
      const s = a.snapshot();
      await tx.saveService(s);
      await this.audit(tx, c.actorId, s, c.action, c.reason, c.requestId);
      return s;
    });
  }
  block(c: BlockCommand) {
    return this.repo.run(async (tx) => {
      const initial = await tx.resource(c.resourceId);
      if (!initial) throw missing();
      await tx.lock(`user:${c.actorId}`);
      await tx.lock(`organization:${initial.organizationId}`);
      await tx.lock(`resource:${initial.id}`);
      await this.auth.requirePermission(
        c.actorId,
        'services.manage',
        initial.organizationId,
      );
      const r = await tx.resource(initial.id);
      if (!r || r.version !== c.expectedVersion)
        throw new ApplicationError('CONFLICT', 'Resource version changed.');
      const now = this.clock.now();
      if (
        !Number.isFinite(+c.startsAt) ||
        !Number.isFinite(+c.endsAt) ||
        c.startsAt < now ||
        c.endsAt <= c.startsAt ||
        +c.endsAt > +now + 210 * 86400000
      )
        throw new ApplicationError(
          'INVALID_INPUT',
          'Blocks require a future interval within 210 days.',
        );
      if (
        (await this.busy.range(r.id, c.startsAt, c.endsAt, now)).length ||
        (await tx.blocks(r.id, c.startsAt, c.endsAt)).some((b) => overlap(b, c))
      )
        throw new ApplicationError(
          'CONFLICT',
          'Block overlaps a booking or existing block.',
        );
      if (
        (await tx.blocks(r.id, now, new Date(+now + 210 * 86400000))).length >=
        100
      )
        throw new ApplicationError(
          'CONFLICT',
          'At most 100 future active blocks per resource.',
        );
      const b = {
        id: this.entropy.id(),
        resourceId: r.id,
        organizationId: r.organizationId,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        reason: administrativeReason(c.reason),
        createdBy: c.actorId,
        createdAt: now,
        releasedAt: null,
      };
      await tx.saveBlock(b);
      r.version++;
      r.updatedAt = now;
      await tx.saveResource(r);
      await this.audit(
        tx,
        c.actorId,
        r,
        'resource_blocked',
        c.reason,
        c.requestId,
      );
      return b;
    });
  }
  release(c: BlockCommand) {
    return this.repo.run(async (tx) => {
      const first = await tx.resource(c.resourceId);
      if (!first) throw missing();
      await tx.lock(`user:${c.actorId}`);
      await tx.lock(`organization:${first.organizationId}`);
      await tx.lock(`resource:${first.id}`);
      await this.auth.requirePermission(
        c.actorId,
        'services.manage',
        first.organizationId,
      );
      const r = await tx.resource(first.id),
        b = c.id ? await tx.block(c.id) : null;
      if (!r || !b || b.resourceId !== r.id) throw missing();
      if (r.version !== c.expectedVersion || b.releasedAt)
        throw new ApplicationError(
          'CONFLICT',
          'Resource changed or block was already released.',
        );
      b.releasedAt = this.clock.now();
      await tx.saveBlock(b);
      r.version++;
      r.updatedAt = this.clock.now();
      await tx.saveResource(r);
      await this.audit(
        tx,
        c.actorId,
        r,
        'block_released',
        c.reason,
        c.requestId,
      );
      return b;
    });
  }
  publicResources(id: string) {
    return this.repo.run(async (tx) => {
      const s = await this.get(id);
      const items: ResourceState[] = [];
      for (const resourceId of s.resourceIds) {
        const r = await tx.resource(resourceId);
        if (
          r &&
          r.organizationId === s.organizationId &&
          r.kind === s.kind &&
          r.status === 'active'
        )
          items.push(r);
      }
      return items;
    });
  }
  preview(id: string, actorId: string) {
    return this.repo.run(async (tx) => {
      await this.auth.requirePermission(
        actorId,
        'moderation.publications.review',
      );
      const s = await tx.service(id);
      if (!s || s.status !== 'pending') throw missing();
      return s;
    });
  }
  activeBlocks(resourceId: string, actorId: string, from: Date, to: Date) {
    return this.repo.run(async (tx) => {
      const r = await tx.resource(resourceId);
      if (!r) throw missing();
      await this.auth.requirePermission(
        actorId,
        'services.manage',
        r.organizationId,
      );
      const now = this.clock.now();
      if (
        !Number.isFinite(+from) ||
        !Number.isFinite(+to) ||
        from < now ||
        to <= from ||
        +to > +now + 210 * 86400000
      )
        throw new ApplicationError(
          'INVALID_INPUT',
          'Read active blocks in a future interval within 210 days.',
        );
      return tx.blocks(resourceId, from, to);
    });
  }
  inspect(id: string) {
    return this.repo.run((tx) => tx.service(id));
  }
  resourceById(id: string) {
    return this.repo.run((tx) => tx.resource(id));
  }
  // The public booking port uses resourceById through its module adapter to avoid overloading the resource command.
  async get(id: string, actorId?: string) {
    return this.repo.run(async (tx) => {
      const s = await tx.service(id);
      if (!s) throw missing();
      if (actorId)
        await this.auth.requirePermission(
          actorId,
          'services.manage',
          s.organizationId,
        );
      else {
        if (s.status !== 'published') throw missing();
        try {
          await this.business(s.organizationId);
          await this.clinical(s);
        } catch {
          throw missing();
        }
      }
      return s;
    });
  }
  list(q: ServicesQuery) {
    return this.repo.run(async (tx) => {
      if (q.actorId && q.moderation) {
        await this.auth.requirePermission(
          q.actorId,
          'moderation.publications.review',
        );
      } else if (q.actorId) {
        if (!q.organizationId)
          throw new ApplicationError(
            'INVALID_INPUT',
            'Organization scope is required.',
          );
        await this.auth.requirePermission(
          q.actorId,
          'services.manage',
          q.organizationId,
        );
      }
      const result = await tx.list(q);
      if (q.actorId) return result;
      const items: ServiceState[] = [];
      for (const s of result.items) {
        try {
          await this.business(s.organizationId);
          await this.clinical(s);
          items.push(s);
        } catch {
          /* Ineligible businesses are hidden. */
        }
      }
      return { ...result, items };
    });
  }
  resources(org: string, actor: string) {
    return this.repo.run(async (tx) => {
      await this.auth.requirePermission(actor, 'services.manage', org);
      return tx.resources(org);
    });
  }
  audits(id: string, actor: string, page: number, limit: number) {
    return this.repo.run(async (tx) => {
      const s = await tx.service(id);
      if (!s) throw missing();
      await this.auth.requirePermission(
        actor,
        'services.manage',
        s.organizationId,
      );
      return tx.audits(id, page, limit);
    });
  }
  async offer(id: string, resourceId: string, sv: number, rv: number) {
    return this.repo.run(async (tx) => {
      const s = await tx.service(id),
        r = await tx.resource(resourceId);
      if (
        !s ||
        !r ||
        s.status !== 'published' ||
        r.status !== 'active' ||
        !s.resourceIds.includes(r.id) ||
        s.organizationId !== r.organizationId
      )
        throw missing();
      if (s.version !== sv || r.version !== rv)
        throw new ApplicationError(
          'CONFLICT',
          'Service or calendar changed. Review availability and terms again.',
        );
      const org = await this.business(s.organizationId);
      const professionalVerifiedUntil = await this.clinical(s);
      return {
        service: s,
        resource: r,
        organizationName: org.name,
        professionalVerifiedUntil,
      };
    });
  }
  blocks(id: string, from: Date, to: Date) {
    return this.repo.run((tx) => tx.blocks(id, from, to));
  }
  availability(q: AvailabilityQuery) {
    return this.repo.run(async (tx) => {
      civilDate(q.from);
      civilDate(q.to);
      const now = this.clock.now();
      if (
        q.from < localDay(now) ||
        q.to < q.from ||
        q.to > nextDay(q.from, 30) ||
        q.to > nextDay(localDay(now), 180)
      )
        throw new ApplicationError(
          'INVALID_INPUT',
          'Availability is bounded to 31 future dates and a 180-day horizon.',
        );
      const s = await this.get(q.serviceId),
        r = await tx.resource(q.resourceId);
      if (!r || r.status !== 'active' || !s.resourceIds.includes(r.id))
        throw missing();
      if (
        !Number.isInteger(q.nights) ||
        q.nights < s.minNights ||
        q.nights > s.maxNights
      )
        throw new ApplicationError(
          'INVALID_INPUT',
          'Stay length is outside accepted service bounds.',
        );
      const professionalVerifiedUntil = await this.clinical(s);
      const from = localInstant(q.from, 0),
        to = localInstant(nextDay(q.to, q.nights + 1), 0);
      const busy = await this.busy.range(r.id, from, to, now),
        blocks = await tx.blocks(r.id, from, to);
      const slots: {
        startsAt: Date;
        endsAt: Date;
        remaining: number;
        totalMinor: number;
      }[] = [];
      let truncated = false;
      for (let day = q.from; day <= q.to; day = nextDay(day)) {
        const candidates =
          s.kind === 'lodging'
            ? [s.checkInMinute!]
            : r.windows
                .filter((w) => w.day === dayOfWeek(day))
                .flatMap((w) =>
                  Array.from(
                    { length: (w.endMinute - w.startMinute) / 15 },
                    (_, i) => w.startMinute + i * 15,
                  ),
                );
        for (const minute of candidates) {
          const startsAt = localInstant(day, minute),
            endsAt =
              s.kind === 'lodging'
                ? localInstant(nextDay(day, q.nights), s.checkOutMinute!)
                : new Date(+startsAt + s.durationMinutes! * 60000);
          const occupied = {
            startsAt: new Date(+startsAt - s.bufferBeforeMinutes * 60000),
            endsAt: new Date(+endsAt + s.bufferAfterMinutes * 60000),
          };
          if (
            +startsAt < +now + s.minimumNoticeMinutes * 60000 ||
            !fitsCalendar(r, occupied) ||
            (professionalVerifiedUntil !== null &&
              endsAt >= professionalVerifiedUntil)
          )
            continue;
          const remaining = availableCapacity(
            r.capacity,
            occupied,
            busy,
            blocks,
          );
          if (!remaining) continue;
          if (slots.length >= 1000) {
            truncated = true;
            break;
          }
          slots.push({
            startsAt,
            endsAt,
            remaining,
            totalMinor: s.priceMinor * (s.kind === 'lodging' ? q.nights : 1),
          });
        }
        if (truncated) break;
      }
      return {
        serviceVersion: s.version,
        resourceVersion: r.version,
        timeZone: 'America/Bogota' as const,
        slots,
        truncated,
      };
    });
  }
}
