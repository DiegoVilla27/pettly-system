import type { BusinessNotifications } from '../../../notifications/application/ports/in/business-notifications';
import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  administrativeReason,
  requireSuperAdmin,
  validateMembershipRole,
} from '../../../../shared/domain/authorization';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { UsersDirectory } from '../../../users/application/ports/out/users-directory';
import { Organization } from '../../domain/aggregates/organization';
import type {
  OrganizationsRepository,
  OrganizationsWork,
} from '../ports/out/organizations-repository';
import type {
  CreateOrganizationCommand,
  AssignMembershipRoleCommand,
  RemoveMembershipRoleCommand,
} from '../commands/organization.commands';
import type { GetOrganizationQuery } from '../queries/get-organization.query';
export class OrganizationsHandlers {
  constructor(
    private readonly repository: OrganizationsRepository,
    private readonly users: UsersDirectory,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
    private readonly notices?: BusinessNotifications,
  ) {}
  private async administrator(
    work: OrganizationsWork,
    actorId: string,
    targetId?: string,
  ) {
    // Shared lock serializes role assignment, bootstrap, membership changes and account suspension.
    await work.lock('users:administration');
    for (const id of [
      ...new Set([actorId, ...(targetId ? [targetId] : [])]),
    ].sort())
      await work.lock(`user:${id}`);
    requireSuperAdmin(await this.users.findById(actorId));
  }
  create(command: CreateOrganizationCommand) {
    const reason = administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      await this.administrator(work, command.actorId);
      const now = this.clock.now();
      const organization = Organization.create(
        this.entropy.id(),
        command.name,
        command.type,
        now,
        command.profile,
      ).snapshot();
      await work.create(organization);
      await work.audit({
        id: this.entropy.id(),
        actorId: command.actorId,
        organizationId: organization.id,
        targetUserId: null,
        action: 'organization.created',
        previousValue: null,
        nextValue: organization.type,
        reason,
        requestId: command.requestId,
        createdAt: now,
      });
      return organization;
    });
  }
  get(query: GetOrganizationQuery) {
    return this.repository.run(async (work) => {
      const actor = await this.users.findById(query.actorId);
      if (!actor || actor.status !== 'active' || !actor.emailVerifiedAt)
        throw new ApplicationError(
          'FORBIDDEN',
          'An active verified account is required.',
        );
      const member = await work.membership(query.organizationId, query.actorId);
      if (
        !member &&
        actor.globalRole !== 'super_admin' &&
        actor.globalRole !== 'moderator'
      )
        throw new ApplicationError(
          'FORBIDDEN',
          'Organization access is required.',
        );
      const organization = await work.find(query.organizationId);
      if (!organization)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Organization was not found.',
        );
      if (
        organization.status === 'deleted' &&
        actor.globalRole !== 'super_admin'
      )
        throw new ApplicationError(
          'FORBIDDEN',
          'Organization access is unavailable.',
        );
      return organization;
    });
  }
  assign(command: AssignMembershipRoleCommand) {
    const reason = administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      await this.administrator(work, command.actorId, command.userId);
      await work.lock(`organization:${command.organizationId}`);
      const organization = await work.find(command.organizationId);
      if (!organization)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Organization was not found.',
        );
      if (organization.status === 'deleted')
        throw new ApplicationError(
          'CONFLICT',
          'An archived organization cannot receive membership changes.',
        );
      if (
        organization.responsibleUserId === command.userId &&
        ['active', 'suspended'].includes(organization.status) &&
        !['business_admin', 'adoption_admin'].includes(command.role)
      )
        throw new ApplicationError(
          'CONFLICT',
          'Transfer responsibility before demoting the responsible administrator.',
        );
      validateMembershipRole(command.role, organization.type);
      const target = await this.users.findById(command.userId);
      if (!target)
        throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
      if (target.status !== 'active' || !target.emailVerifiedAt)
        throw new ApplicationError(
          'CONFLICT',
          'The target must be active and email verified.',
        );
      const previous = await work.membership(organization.id, target.id);
      if (previous?.role === command.role) return previous;
      const now = this.clock.now();
      const membership = await work.assign(
        previous?.id ?? this.entropy.id(),
        organization.id,
        target.id,
        command.role,
        now,
      );
      const auditId = this.entropy.id();
      await work.audit({
        id: auditId,
        actorId: command.actorId,
        organizationId: organization.id,
        targetUserId: target.id,
        action: 'membership.role_assigned',
        previousValue: previous?.role ?? null,
        nextValue: command.role,
        reason,
        requestId: command.requestId,
        createdAt: now,
      });
      await this.notices?.publish({
        eventKey: auditId,
        category: 'organizations',
        eventType: 'membership.role_assigned',
        subjectType: 'organization',
        subjectId: organization.id,
        subjectVersion: organization.version,
        status: command.role,
        recipientIds: [target.id],
        now,
      });
      return membership;
    });
  }
  remove(command: RemoveMembershipRoleCommand) {
    const reason = administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      await this.administrator(work, command.actorId, command.userId);
      await work.lock(`organization:${command.organizationId}`);
      const organization = await work.find(command.organizationId);
      if (!organization)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Organization was not found.',
        );
      if (organization.status === 'deleted')
        throw new ApplicationError(
          'CONFLICT',
          'An archived organization cannot receive membership changes.',
        );
      if (
        organization.responsibleUserId === command.userId &&
        ['active', 'suspended'].includes(organization.status)
      )
        throw new ApplicationError(
          'CONFLICT',
          'Transfer responsibility before removing the responsible administrator.',
        );
      const previous = await work.membership(
        command.organizationId,
        command.userId,
      );
      if (!previous) return;
      const auditId = this.entropy.id();
      await work.remove(previous.id);
      await this.notices?.publish({
        eventKey: auditId,
        category: 'organizations',
        eventType: 'membership.role_removed',
        subjectType: 'organization',
        subjectId: organization.id,
        subjectVersion: organization.version,
        status: 'removed',
        recipientIds: [command.userId],
        now: this.clock.now(),
      });
      await work.audit({
        id: auditId,
        actorId: command.actorId,
        organizationId: command.organizationId,
        targetUserId: command.userId,
        action: 'membership.role_removed',
        previousValue: previous.role,
        nextValue: null,
        reason,
        requestId: command.requestId,
        createdAt: this.clock.now(),
      });
    });
  }
}
