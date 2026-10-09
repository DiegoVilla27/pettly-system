import type {
  OrganizationType,
  MembershipRole,
} from '../../../../shared/domain/authorization';
export class CreateOrganizationCommand {
  constructor(
    readonly actorId: string,
    readonly name: string,
    readonly type: OrganizationType,
    readonly reason: string,
    readonly requestId: string,
    readonly profile: import('../results/organization').OrganizationProfileChanges = {},
  ) {}
}
export class AssignMembershipRoleCommand {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly userId: string,
    readonly role: MembershipRole,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
export class RemoveMembershipRoleCommand {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly userId: string,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
