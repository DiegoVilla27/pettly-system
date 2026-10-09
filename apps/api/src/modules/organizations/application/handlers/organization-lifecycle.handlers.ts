import type { BusinessNotifications } from '../../../notifications/application/ports/in/business-notifications';
import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  administrativeReason,
  requireSuperAdmin,
  ORGANIZATION_TYPES,
  type MembershipRole,
} from '../../../../shared/domain/authorization';
import { ORGANIZATION_STATUSES } from '../../../../shared/domain/organization-state';
import { COUNTRY_CODES } from '../../../../shared/domain/profile-details';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { UsersDirectory } from '../../../users/application/ports/out/users-directory';
import { Organization } from '../../domain/aggregates/organization';
import type {
  OrganizationsRepository,
  OrganizationsWork,
  OrganizationAudit,
} from '../ports/out/organizations-repository';
import type {
  RequestOrganizationCommand,
  UpdateOrganizationProfileCommand,
  OrganizationDecisionCommand,
  OrganizationStatusCommand,
} from '../commands/organization-lifecycle.commands';
import type {
  ListOrganizationsQuery,
  OrganizationPageQuery,
} from '../queries/organization-management.queries';
import type { GetOrganizationQuery } from '../queries/get-organization.query';
import type { OrganizationResult } from '../results/organization';
export class OrganizationLifecycleHandlers {
  constructor(
    private readonly repository: OrganizationsRepository,
    private readonly users: UsersDirectory,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
    private readonly notices?: BusinessNotifications,
  ) {}
  private async actor(id: string) {
    const actor = await this.users.findById(id);
    if (!actor || actor.status !== 'active' || !actor.emailVerifiedAt)
      throw new ApplicationError(
        'FORBIDDEN',
        'An active verified account is required.',
      );
    return actor;
  }
  private async load(work: OrganizationsWork, id: string) {
    const state = await work.find(id);
    if (!state)
      throw new ApplicationError(
        'RESOURCE_NOT_FOUND',
        'Organization was not found.',
      );
    return Organization.restore(state);
  }
  private async administrator(
    work: OrganizationsWork,
    actorId: string,
    targetId?: string,
  ) {
    await work.lock('users:administration');
    for (const id of [
      ...new Set([actorId, ...(targetId ? [targetId] : [])]),
    ].sort())
      await work.lock(`user:${id}`);
    requireSuperAdmin(await this.users.findById(actorId));
  }
  private async manager(
    work: OrganizationsWork,
    actorId: string,
    id: string,
    allowApplicant: boolean,
  ) {
    const actor = await this.actor(actorId);
    const membership = await work.membership(id, actorId);
    if (actor.globalRole === 'super_admin') return this.load(work, id);
    const isAdmin =
      membership &&
      ['business_admin', 'adoption_admin'].includes(membership.role);
    const organization = await work.find(id);
    const applicant =
      allowApplicant &&
      organization?.applicantId === actorId &&
      ['draft', 'pending', 'rejected'].includes(organization.status);
    if (!isAdmin && !applicant)
      throw new ApplicationError(
        'FORBIDDEN',
        'Organization administrator or own application access is required.',
      );
    if (!organization || organization.status === 'deleted')
      throw new ApplicationError(
        'FORBIDDEN',
        'Organization access is unavailable.',
      );
    return Organization.restore(organization);
  }
  private async audit(
    work: OrganizationsWork,
    actorId: string,
    organizationId: string,
    requestId: string,
    reason: string,
    action: OrganizationAudit['action'],
    previousValue: string | null,
    nextValue: string | null,
    targetUserId: string | null = null,
  ) {
    const auditId = this.entropy.id();
    await work.audit({
      id: auditId,
      actorId,
      organizationId,
      targetUserId,
      action,
      previousValue,
      nextValue,
      reason,
      requestId,
      createdAt: this.clock.now(),
    });
    if (this.notices && action !== 'organization.profile_updated') {
      const s = await work.find(organizationId);
      if (s)
        await this.notices.publish({
          eventKey: auditId,
          category: 'organizations',
          eventType: action,
          subjectType: 'organization',
          subjectId: organizationId,
          subjectVersion: s.version,
          status: action.startsWith('membership.')
            ? (nextValue ?? 'removed')
            : s.status,
          recipientIds: [
            ...new Set(
              [
                s.applicantId,
                s.responsibleUserId,
                targetUserId,
                action === 'organization.responsible_changed'
                  ? previousValue
                  : null,
              ].filter((id): id is string => !!id),
            ),
          ],
          now: this.clock.now(),
        });
    }
  }
  private page(page: number, limit: number) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new ApplicationError('INVALID_INPUT', 'Invalid pagination.');
  }
  request(command: RequestOrganizationCommand) {
    return this.repository.run(async (work) => {
      await work.lock(`user:${command.actorId}`);
      await this.actor(command.actorId);
      const state = Organization.create(
        this.entropy.id(),
        command.name,
        command.type,
        this.clock.now(),
        command.profile,
        command.actorId,
      ).snapshot();
      await work.create(state);
      await this.audit(
        work,
        command.actorId,
        state.id,
        command.requestId,
        'Organization onboarding initiated by the verified applicant.',
        'organization.requested',
        null,
        state.type,
      );
      return state;
    });
  }
  list(query: ListOrganizationsQuery) {
    this.page(query.page, query.limit);
    if (
      (query.status && !ORGANIZATION_STATUSES.includes(query.status)) ||
      (query.type && !ORGANIZATION_TYPES.includes(query.type)) ||
      (query.countryCode && !COUNTRY_CODES.includes(query.countryCode)) ||
      (query.search &&
        (!query.search.trim() ||
          query.search.length > 100 ||
          /\p{Cc}/u.test(query.search)))
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Invalid organization filters.',
      );
    return this.repository.run(async (work) => {
      const actor = await this.actor(query.actorId);
      if (!query.mine) requireSuperAdmin(actor);
      return work.list(query);
    });
  }
  profile(query: GetOrganizationQuery) {
    return this.repository.run(async (work) =>
      (
        await this.manager(work, query.actorId, query.organizationId, true)
      ).snapshot(),
    );
  }
  updateProfile(command: UpdateOrganizationProfileCommand) {
    const reason = administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      await work.lock(`user:${command.actorId}`);
      await work.lock(`organization:${command.organizationId}`);
      const organization = await this.manager(
          work,
          command.actorId,
          command.organizationId,
          true,
        ),
        previous = organization.snapshot();
      organization.expectVersion(command.expectedVersion);
      const actor = await this.actor(command.actorId);
      if (
        !organization.updateProfile(
          command.profile,
          this.clock.now(),
          actor.globalRole === 'super_admin',
        )
      )
        return previous;
      const state = organization.snapshot();
      await work.save(state);
      await this.audit(
        work,
        command.actorId,
        state.id,
        command.requestId,
        reason,
        'organization.profile_updated',
        'profile',
        'profile',
      );
      if (previous.status !== state.status)
        await this.audit(
          work,
          command.actorId,
          state.id,
          command.requestId,
          reason,
          'organization.submitted',
          previous.status,
          state.status,
        );
      return state;
    });
  }
  submit(command: OrganizationDecisionCommand) {
    const reason = administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      await work.lock(`user:${command.actorId}`);
      await work.lock(`organization:${command.organizationId}`);
      const organization = await this.manager(
        work,
        command.actorId,
        command.organizationId,
        true,
      );
      organization.expectVersion(command.expectedVersion);
      const previous = organization.snapshot().status;
      organization.submit(this.clock.now());
      const state = organization.snapshot();
      await work.save(state);
      await this.audit(
        work,
        command.actorId,
        state.id,
        command.requestId,
        reason,
        'organization.submitted',
        previous,
        state.status,
      );
      return state;
    });
  }
  private async assignResponsible(
    work: OrganizationsWork,
    state: OrganizationResult,
    userId: string,
    actorId: string,
    reason: string,
    requestId: string,
  ) {
    const user = await this.users.findById(userId);
    if (!user || user.status !== 'active' || !user.emailVerifiedAt)
      throw new ApplicationError(
        'CONFLICT',
        'The responsible account must be active and email verified.',
      );
    const role: MembershipRole =
      state.type === 'business' ? 'business_admin' : 'adoption_admin';
    const previous = await work.membership(state.id, userId);
    if (previous?.role === role) return;
    await work.assign(
      previous?.id ?? this.entropy.id(),
      state.id,
      userId,
      role,
      this.clock.now(),
    );
    await this.audit(
      work,
      actorId,
      state.id,
      requestId,
      reason,
      'membership.role_assigned',
      previous?.role ?? null,
      role,
      userId,
    );
  }
  private async responsibleAvailable(
    work: OrganizationsWork,
    state: OrganizationResult,
  ) {
    const id = state.responsibleUserId;
    const user = id ? await this.users.findById(id) : null;
    const membership = id ? await work.membership(state.id, id) : null;
    if (
      !user ||
      user.status !== 'active' ||
      !user.emailVerifiedAt ||
      !membership ||
      !['business_admin', 'adoption_admin'].includes(membership.role)
    )
      throw new ApplicationError(
        'CONFLICT',
        'An active verified organization administrator must be responsible before activation.',
      );
  }
  approve(command: OrganizationDecisionCommand) {
    const reason = administrativeReason(command.reason);
    if (!command.responsibleUserId)
      throw new ApplicationError(
        'INVALID_INPUT',
        'A responsible user UUID is required.',
      );
    return this.repository.run(async (work) => {
      await this.administrator(
        work,
        command.actorId,
        command.responsibleUserId,
      );
      await work.lock(`organization:${command.organizationId}`);
      const organization = await this.load(work, command.organizationId);
      organization.expectVersion(command.expectedVersion);
      organization.review(
        true,
        command.actorId,
        reason,
        command.responsibleUserId!,
        this.clock.now(),
      );
      const state = organization.snapshot();
      await this.assignResponsible(
        work,
        state,
        command.responsibleUserId!,
        command.actorId,
        reason,
        command.requestId,
      );
      await work.save(state);
      await this.audit(
        work,
        command.actorId,
        state.id,
        command.requestId,
        reason,
        'organization.approved',
        'pending',
        'active',
        command.responsibleUserId!,
      );
      return state;
    });
  }
  reject(command: OrganizationDecisionCommand) {
    const reason = administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      await this.administrator(work, command.actorId);
      await work.lock(`organization:${command.organizationId}`);
      const organization = await this.load(work, command.organizationId);
      organization.expectVersion(command.expectedVersion);
      organization.review(
        false,
        command.actorId,
        reason,
        null,
        this.clock.now(),
      );
      const state = organization.snapshot();
      await work.save(state);
      await this.audit(
        work,
        command.actorId,
        state.id,
        command.requestId,
        reason,
        'organization.rejected',
        'pending',
        'rejected',
      );
      return state;
    });
  }
  status(command: OrganizationStatusCommand) {
    const reason = administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      await this.administrator(work, command.actorId);
      await work.lock(`organization:${command.organizationId}`);
      const organization = await this.load(work, command.organizationId);
      organization.expectVersion(command.expectedVersion);
      const previous = organization.snapshot();
      if (command.status === 'active')
        await this.responsibleAvailable(work, previous);
      if (!organization.setStatus(command.status, this.clock.now()))
        return previous;
      const state = organization.snapshot();
      await work.save(state);
      await this.audit(
        work,
        command.actorId,
        state.id,
        command.requestId,
        reason,
        'organization.status_changed',
        previous.status,
        state.status,
      );
      return state;
    });
  }
  responsible(command: OrganizationDecisionCommand) {
    const reason = administrativeReason(command.reason);
    if (!command.responsibleUserId)
      throw new ApplicationError(
        'INVALID_INPUT',
        'A responsible user UUID is required.',
      );
    return this.repository.run(async (work) => {
      await this.administrator(
        work,
        command.actorId,
        command.responsibleUserId,
      );
      await work.lock(`organization:${command.organizationId}`);
      const organization = await this.load(work, command.organizationId);
      organization.expectVersion(command.expectedVersion);
      const previous = organization.snapshot();
      const changed = organization.setResponsible(
        command.responsibleUserId!,
        this.clock.now(),
      );
      await this.assignResponsible(
        work,
        organization.snapshot(),
        command.responsibleUserId!,
        command.actorId,
        reason,
        command.requestId,
      );
      if (!changed) return previous;
      const state = organization.snapshot();
      await work.save(state);
      await this.audit(
        work,
        command.actorId,
        state.id,
        command.requestId,
        reason,
        'organization.responsible_changed',
        previous.responsibleUserId,
        state.responsibleUserId,
        state.responsibleUserId,
      );
      return state;
    });
  }
  archive(command: OrganizationDecisionCommand) {
    const reason = administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      await this.administrator(work, command.actorId);
      await work.lock(`organization:${command.organizationId}`);
      const organization = await this.load(work, command.organizationId);
      const previous = organization.snapshot();
      if (previous.status === 'deleted') return;
      organization.expectVersion(command.expectedVersion);
      organization.archive(this.clock.now());
      await work.save(organization.snapshot());
      await this.audit(
        work,
        command.actorId,
        previous.id,
        command.requestId,
        reason,
        'organization.deleted',
        previous.status,
        'deleted',
      );
    });
  }
  members(query: OrganizationPageQuery) {
    this.page(query.page, query.limit);
    return this.repository.run(async (work) => {
      await this.manager(work, query.actorId, query.organizationId, false);
      return work.members(query.organizationId, query.page, query.limit);
    });
  }
  audits(query: OrganizationPageQuery) {
    this.page(query.page, query.limit);
    return this.repository.run(async (work) => {
      requireSuperAdmin(await this.actor(query.actorId));
      await this.load(work, query.organizationId);
      return work.audits(query.organizationId, query.page, query.limit);
    });
  }
}
