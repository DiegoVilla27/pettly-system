import type { OrganizationType } from '../../../../shared/domain/authorization';
import type { OrganizationProfileChanges } from '../results/organization';
export class RequestOrganizationCommand {
  constructor(
    readonly actorId: string,
    readonly name: string,
    readonly type: OrganizationType,
    readonly profile: OrganizationProfileChanges,
    readonly requestId: string,
  ) {}
}
export class UpdateOrganizationProfileCommand {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly profile: OrganizationProfileChanges,
    readonly reason: string,
    readonly requestId: string,
    readonly expectedVersion: number,
  ) {}
}
export class OrganizationDecisionCommand {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly reason: string,
    readonly requestId: string,
    readonly expectedVersion: number,
    readonly responsibleUserId?: string,
  ) {}
}
export class OrganizationStatusCommand extends OrganizationDecisionCommand {
  constructor(
    actorId: string,
    organizationId: string,
    reason: string,
    requestId: string,
    expectedVersion: number,
    readonly status: 'active' | 'suspended',
  ) {
    super(actorId, organizationId, reason, requestId, expectedVersion);
  }
}
