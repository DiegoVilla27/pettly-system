import type { ServiceDetails, ResourceDetails } from '../results/service';
export class ServiceCommand {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly id: string | null,
    readonly expectedVersion: number,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
export class ConfigureServiceCommand extends ServiceCommand {
  constructor(
    actor: string,
    org: string,
    id: string | null,
    version: number,
    reason: string,
    requestId: string,
    readonly data: ServiceDetails,
  ) {
    super(actor, org, id, version, reason, requestId);
  }
}
export class ConfigureResourceCommand extends ServiceCommand {
  constructor(
    actor: string,
    org: string,
    id: string | null,
    version: number,
    reason: string,
    requestId: string,
    readonly data: ResourceDetails,
  ) {
    super(actor, org, id, version, reason, requestId);
  }
}
export class ServiceDecisionCommand extends ServiceCommand {
  constructor(
    actor: string,
    org: string,
    id: string,
    version: number,
    reason: string,
    requestId: string,
    readonly action: 'submit' | 'review' | 'pause' | 'archive',
    readonly approved = false,
  ) {
    super(actor, org, id, version, reason, requestId);
  }
}
export class BlockCommand {
  constructor(
    readonly actorId: string,
    readonly resourceId: string,
    readonly id: string | null,
    readonly expectedVersion: number,
    readonly startsAt: Date,
    readonly endsAt: Date,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
