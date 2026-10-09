import { ApplicationError } from '../../../../shared/domain/application-error';
import { Email } from '../../../../shared/domain/email';
import {
  administrativeReason,
  requireSuperAdmin,
} from '../../../../shared/domain/authorization';
import { Password } from '../../domain/value-objects/password';
import type { HandlerDependencies } from './handler-dependencies';
import type { AuthWork } from '../ports/out/auth-persistence';
import type {
  InviteAccountCommand,
  DeleteAccountCommand,
  AccountAdministration,
} from '../ports/in/account-administration';
import type {
  ChangePasswordCommand,
  ChangeEmailCommand,
  ConfirmEmailChangeCommand,
  AcceptInvitationCommand,
  RevokeSessionCommand,
} from '../commands/account-security.commands';
import type { ListSessionsQuery } from '../queries/list-sessions.query';
export class AccountSecurityHandlers implements AccountAdministration {
  constructor(private readonly deps: HandlerDependencies) {}
  private async password(userId: string, password: string) {
    const hash = await this.deps.uow.run((work) =>
      work.auth.passwordHash(userId),
    );
    if (!hash || !(await this.deps.passwords.verify(hash, password)))
      throw new ApplicationError(
        'INVALID_CREDENTIALS',
        'The current password is incorrect.',
      );
    return hash;
  }
  private async session(work: AuthWork, userId: string, sessionId: string) {
    const session = await work.auth.session(sessionId);
    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt ||
      session.expiresAt <= this.deps.clock.now()
    )
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'The session is unavailable.',
      );
  }
  private async active(work: AuthWork, userId: string) {
    const user = await work.users.findById(userId);
    if (!user || user.status !== 'active' || !user.emailVerifiedAt)
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'The account is unavailable.',
      );
    return user;
  }
  async invite(command: InviteAccountCommand) {
    const reason = administrativeReason(command.reason),
      email = Email.create(command.email).value;
    return this.deps.uow.run(async (work) => {
      await work.lock('users:administration');
      await work.lock(`email:${email}`);
      await work.lock(`user:${command.actorId}`);
      requireSuperAdmin(await work.users.findById(command.actorId));
      if (await work.users.findByEmail(email))
        throw new ApplicationError(
          'EMAIL_TAKEN',
          'Email is already registered.',
        );
      const now = this.deps.clock.now(),
        user = await work.users.create(
          this.deps.entropy.id(),
          email,
          command.profile,
          now,
        );
      const token = this.deps.entropy.token(),
        expiresAt = new Date(now.getTime() + 86400000);
      await work.auth.replaceActionToken({
        hash: this.deps.entropy.digest(token),
        userId: user.id,
        purpose: 'invitation',
        expiresAt,
        consumedAt: null,
      });
      await work.enqueueEmail({
        userId: user.id,
        id: this.deps.entropy.id(),
        to: email,
        token,
        purpose: 'invitation',
        expiresAt,
      });
      await work.users.audit({
        id: this.deps.entropy.id(),
        actorId: command.actorId,
        targetId: user.id,
        action: 'user.created',
        previousValue: 'none',
        nextValue: 'user',
        reason,
        requestId: command.requestId,
        createdAt: now,
      });
      return user;
    });
  }
  async resendInvitation(
    command: import('../ports/in/account-administration').ResendInvitationCommand,
  ) {
    const reason = administrativeReason(command.reason);
    return this.deps.uow.run(async (work) => {
      await work.lock('users:administration');
      for (const id of [...new Set([command.actorId, command.userId])].sort())
        await work.lock(`user:${id}`);
      requireSuperAdmin(await work.users.findById(command.actorId));
      const user = await work.users.findById(command.userId);
      if (!user)
        throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
      if (
        user.status !== 'active' ||
        user.emailVerifiedAt ||
        (await work.auth.passwordHash(user.id))
      )
        throw new ApplicationError(
          'CONFLICT',
          'Only an active pending invitation may be resent.',
        );
      const now = this.deps.clock.now(),
        token = this.deps.entropy.token(),
        expiresAt = new Date(now.getTime() + 86400000);
      await work.auth.replaceActionToken({
        hash: this.deps.entropy.digest(token),
        userId: user.id,
        purpose: 'invitation',
        expiresAt,
        consumedAt: null,
      });
      await work.enqueueEmail({
        userId: user.id,
        id: this.deps.entropy.id(),
        to: user.email,
        token,
        purpose: 'invitation',
        expiresAt,
      });
      await work.users.audit({
        id: this.deps.entropy.id(),
        actorId: command.actorId,
        targetId: user.id,
        action: 'user.invitation_resent',
        previousValue: 'pending',
        nextValue: 'pending',
        reason,
        requestId: command.requestId,
        createdAt: now,
      });
    });
  }
  async accept(command: AcceptInvitationCommand) {
    Password.validate(command.password);
    const passwordHash = await this.deps.passwords.hash(command.password);
    await this.deps.uow.run(async (work) => {
      const hash = this.deps.entropy.digest(command.token),
        initial = await work.auth.actionToken(hash);
      if (!initial)
        throw new ApplicationError(
          'INVALID_TOKEN',
          'Invitation is invalid or expired.',
        );
      await work.lock(`user:${initial.userId}`);
      const token = await work.auth.actionToken(hash),
        user = await work.users.findById(initial.userId);
      if (
        !token ||
        token.purpose !== 'invitation' ||
        token.consumedAt ||
        token.expiresAt <= this.deps.clock.now() ||
        !user ||
        user.status !== 'active'
      )
        throw new ApplicationError(
          'INVALID_TOKEN',
          'Invitation is invalid or expired.',
        );
      await work.auth.savePassword(user.id, passwordHash);
      await work.users.verifyEmail(user.id, this.deps.clock.now());
      await work.auth.consumeActionToken(hash, this.deps.clock.now());
      await work.cancelEmail(user.email, 'invitation', user.id);
    });
  }
  async changePassword(command: ChangePasswordCommand) {
    Password.validate(command.newPassword);
    const previous = await this.password(
      command.userId,
      command.currentPassword,
    );
    if (await this.deps.passwords.verify(previous, command.newPassword))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Choose a different password.',
      );
    const hash = await this.deps.passwords.hash(command.newPassword);
    await this.deps.uow.run(async (work) => {
      await work.lock(`user:${command.userId}`);
      const user = await this.active(work, command.userId);
      await this.session(work, user.id, command.sessionId);
      if ((await work.auth.passwordHash(user.id)) !== previous)
        throw new ApplicationError(
          'CONFLICT',
          'Credentials changed. Authenticate again.',
        );
      const pending = await work.auth.pendingEmail(user.id);
      if (pending) await work.cancelEmail(pending, 'email_change', user.id);
      await work.cancelEmail(user.email, 'email_change', user.id);
      await work.auth.savePassword(user.id, hash);
      await work.auth.revokeAll(user.id, this.deps.clock.now());
      await work.auth.invalidateAllActionTokens(user.id, this.deps.clock.now());
      await work.auth.setPendingEmail(user.id, null);
      await work.cancelEmail(user.email, 'reset', user.id);
      await this.notice(work, user.id, user.email, 'password_changed');
    });
  }
  async changeEmail(command: ChangeEmailCommand) {
    const email = Email.create(command.email).value,
      previous = await this.password(command.userId, command.password);
    await this.deps.uow.run(async (work) => {
      await work.lock(`email:${email}`);
      await work.lock(`user:${command.userId}`);
      const user = await this.active(work, command.userId);
      await this.session(work, user.id, command.sessionId);
      if (user.email === email)
        throw new ApplicationError(
          'INVALID_INPUT',
          'Choose a different email address.',
        );
      if ((await work.auth.passwordHash(user.id)) !== previous)
        throw new ApplicationError(
          'CONFLICT',
          'Credentials changed. Authenticate again.',
        );
      if (await work.users.findByEmail(email))
        throw new ApplicationError(
          'EMAIL_TAKEN',
          'Email is already registered.',
        );

      const pending = await work.auth.pendingEmail(user.id);
      if (pending) await work.cancelEmail(pending, 'email_change', user.id);
      const token = this.deps.entropy.token(),
        expiresAt = new Date(this.deps.clock.now().getTime() + 1800000);
      await work.auth.replaceActionToken({
        hash: this.deps.entropy.digest(token),
        userId: user.id,
        purpose: 'email_change',
        expiresAt,
        consumedAt: null,
      });
      await work.auth.setPendingEmail(user.id, email);
      await work.enqueueEmail({
        userId: user.id,
        id: this.deps.entropy.id(),
        to: email,
        token,
        purpose: 'email_change',
        expiresAt,
      });
      await this.notice(work, user.id, user.email, 'email_change_requested');
    });
  }
  async confirmEmail(command: ConfirmEmailChangeCommand) {
    await this.deps.uow.run(async (work) => {
      const hash = this.deps.entropy.digest(command.token),
        initial = await work.auth.actionToken(hash);
      if (!initial)
        throw new ApplicationError(
          'INVALID_TOKEN',
          'Email change is invalid or expired.',
        );
      if (initial.purpose !== 'email_change')
        throw new ApplicationError(
          'INVALID_TOKEN',
          'Email change is invalid or expired.',
        );
      const pending = await work.auth.pendingEmail(initial.userId);
      if (!pending)
        throw new ApplicationError(
          'INVALID_TOKEN',
          'Email change is invalid or expired.',
        );
      await work.lock(`email:${pending}`);
      await work.lock(`user:${initial.userId}`);
      const token = await work.auth.actionToken(hash),
        user = await this.active(work, initial.userId);
      if (
        !token ||
        token.purpose !== 'email_change' ||
        token.consumedAt ||
        token.expiresAt <= this.deps.clock.now() ||
        (await work.auth.pendingEmail(user.id)) !== pending
      )
        throw new ApplicationError(
          'INVALID_TOKEN',
          'Email change is invalid or expired.',
        );
      if (await work.users.findByEmail(pending))
        throw new ApplicationError(
          'EMAIL_TAKEN',
          'Email is already registered.',
        );
      const now = this.deps.clock.now();
      await work.users.changeEmail(user.id, pending, now);
      await work.auth.setPendingEmail(user.id, null);
      await work.auth.invalidateAllActionTokens(user.id, now);
      await work.auth.revokeAll(user.id, now);
      for (const purpose of [
        'verification',
        'reset',
        'email_change',
        'invitation',
      ] as const) {
        await work.cancelEmail(user.email, purpose, user.id);
        await work.cancelEmail(pending, purpose, user.id);
      }
      await work.users.audit({
        id: this.deps.entropy.id(),
        actorId: user.id,
        targetId: user.id,
        action: 'user.email_changed',
        previousValue: 'email',
        nextValue: 'email',
        reason: 'Email changed after password and new-address verification.',
        requestId: null,
        createdAt: now,
      });
      await this.notice(work, user.id, user.email, 'email_changed');
      await this.notice(work, user.id, pending, 'email_changed');
    });
  }
  listSessions(query: ListSessionsQuery) {
    if (
      !Number.isInteger(query.page) ||
      query.page < 1 ||
      query.page > 100000 ||
      !Number.isInteger(query.limit) ||
      query.limit < 1 ||
      query.limit > 100
    )
      throw new ApplicationError('INVALID_INPUT', 'Invalid pagination.');
    return this.deps.uow.run(async (work) => {
      await this.active(work, query.userId);
      const rows = await work.auth.sessions(
        query.userId,
        this.deps.clock.now(),
        query.page,
        query.limit,
      );
      return {
        ...rows,
        items: rows.items.map((session) => ({
          ...session,
          current: session.id === query.currentSessionId,
        })),
        page: query.page,
        limit: query.limit,
      };
    });
  }
  revokeSession(command: RevokeSessionCommand) {
    return this.deps.uow.run(async (work) => {
      await work.lock(`user:${command.userId}`);
      await this.active(work, command.userId);
      const session = await work.auth.session(command.sessionId);
      if (!session || session.userId !== command.userId)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Session was not found.',
        );
      await work.auth.revokeSession(session.id, this.deps.clock.now());
    });
  }
  async remove(command: DeleteAccountCommand) {
    const reason = administrativeReason(command.reason),
      self = !command.administrative;
    if (self && command.actorId !== command.userId)
      throw new ApplicationError(
        'FORBIDDEN',
        'Only your own account may be deleted.',
      );
    const previous = self
      ? await this.password(command.actorId, command.password ?? '')
      : null;
    await this.deps.uow.run(async (work) => {
      await work.lock('users:administration');
      for (const id of [...new Set([command.actorId, command.userId])].sort())
        await work.lock(`user:${id}`);
      const actor = await this.active(work, command.actorId);
      if (command.administrative) requireSuperAdmin(actor);
      const user = await work.users.findById(command.userId);
      if (!user)
        throw new ApplicationError('USER_NOT_FOUND', 'User was not found.');
      if (user.status === 'deleted') return;
      if (self) {
        if ((await work.auth.passwordHash(actor.id)) !== previous)
          throw new ApplicationError(
            'CONFLICT',
            'Credentials changed. Authenticate again.',
          );
      }
      if (
        user.globalRole === 'super_admin' &&
        user.status === 'active' &&
        user.emailVerifiedAt &&
        (await work.users.countActiveSuperAdmins()) <= 1
      )
        throw new ApplicationError(
          'CONFLICT',
          'The last active super administrator cannot be deleted.',
        );
      const now = this.deps.clock.now();
      const pending = await work.auth.pendingEmail(user.id);
      for (const to of new Set([user.email, ...(pending ? [pending] : [])]))
        for (const purpose of [
          'verification',
          'reset',
          'invitation',
          'email_change',
          'password_changed',
          'email_changed',
          'email_change_requested',
        ] as const)
          await work.cancelEmail(to, purpose, user.id);
      await work.auth.eraseAuthentication(user.id, now);
      await work.users.anonymize(user.id, now);
      await work.users.audit({
        id: this.deps.entropy.id(),
        actorId: command.actorId,
        targetId: user.id,
        action: 'user.deleted',
        previousValue: user.status,
        nextValue: 'deleted',
        reason,
        requestId: command.requestId,
        createdAt: now,
      });
    });
  }
  private async notice(
    work: AuthWork,
    userId: string,
    to: string,
    purpose: 'password_changed' | 'email_changed' | 'email_change_requested',
  ) {
    await work.enqueueEmail({
      userId,
      id: this.deps.entropy.id(),
      to,
      token: '',
      purpose,
      expiresAt: new Date(this.deps.clock.now().getTime() + 86400000),
    });
  }
}
