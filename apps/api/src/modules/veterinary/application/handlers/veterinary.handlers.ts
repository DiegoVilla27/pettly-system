import type { ServiceResourceDirectory } from '../../../services/application/ports/in/service-resource-directory';
import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  administrativeReason,
  requireSuperAdmin,
} from '../../../../shared/domain/authorization';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { UsersDirectory } from '../../../users/application/ports/out/users-directory';
import type { OrganizationAccess } from '../../../organizations/application/ports/in/organization-access';
import type { Media } from '../../../media/application/ports/in/media';
import { Credential, currentCredential } from '../../domain/credential';
import type { CredentialState } from '../results/credential';
import type {
  CredentialsRepository,
  CredentialsWork,
} from '../ports/out/credentials-repository';
import type { VeterinaryEligibility } from '../ports/in/veterinary-eligibility';
import type { VeterinaryUseCases } from '../ports/in/veterinary-use-cases';
import type {
  ConfigureCredentialCommand,
  CredentialActionCommand,
  CredentialDocumentCommand,
} from '../commands/credential.commands';
import type {
  CredentialQuery,
  CredentialsQuery,
} from '../queries/credential.queries';
export class VeterinaryHandlers
  implements VeterinaryUseCases, VeterinaryEligibility
{
  constructor(
    private readonly repo: CredentialsRepository,
    private readonly users: UsersDirectory,
    private readonly orgs: OrganizationAccess,
    private readonly media: Media,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
    private readonly schedules: ServiceResourceDirectory,
  ) {}
  private async actor(id: string) {
    const u = await this.users.findById(id);
    if (!u || u.status !== 'active' || !u.emailVerifiedAt)
      throw new ApplicationError(
        'FORBIDDEN',
        'An active verified account is required.',
      );
    return u;
  }
  private async professional(id: string, orgId: string) {
    await this.actor(id);
    const org = await this.orgs.findOrganization(orgId);
    const memberships = await this.orgs.membershipsForUser(id);
    if (
      !org ||
      org.status !== 'active' ||
      org.type !== 'business' ||
      org.countryCode !== 'CO' ||
      !memberships.some(
        (m) =>
          m.organizationId === orgId &&
          ['business_admin', 'business_operator'].includes(m.role),
      )
    )
      throw new ApplicationError(
        'CONFLICT',
        'Professional must currently belong to an active Colombian business.',
      );
  }
  private async access(actor: string, s: CredentialState, write = false) {
    const u = await this.actor(actor);
    if (u.globalRole === 'super_admin') return;
    if (actor !== s.professionalId)
      throw new ApplicationError(
        'FORBIDDEN',
        'Only the professional or global superadmin can access credential evidence.',
      );
    if (write) await this.professional(actor, s.organizationId);
  }
  private async load(tx: CredentialsWork, id: string) {
    const s = await tx.find(id);
    if (!s)
      throw new ApplicationError(
        'RESOURCE_NOT_FOUND',
        'Credential was not found.',
      );
    return s;
  }
  private async record(
    tx: CredentialsWork,
    s: CredentialState,
    actorId: string,
    action: string,
    reason: string,
    requestId: string,
  ) {
    await tx.save(s);
    await tx.audit({
      id: this.entropy.id(),
      credentialId: s.id,
      actorId,
      action,
      version: s.version,
      snapshot: s,
      reason: administrativeReason(reason),
      requestId,
      createdAt: this.clock.now(),
    });
    return s;
  }
  configure(c: ConfigureCredentialCommand) {
    return this.repo.run(async (tx) => {
      await tx.lock(`user:${c.actorId}`);
      await tx.lock(`organization:${c.organizationId}`);
      const u = await this.actor(c.actorId);
      if (c.actorId !== c.professionalId) requireSuperAdmin(u);
      await this.professional(c.professionalId, c.organizationId);
      const resource = await this.schedules.find(c.resourceId);
      if (
        !resource ||
        resource.organizationId !== c.organizationId ||
        resource.kind !== 'appointment' ||
        resource.capacity !== 1 ||
        resource.status !== 'active'
      )
        throw new ApplicationError(
          'CONFLICT',
          'Active dedicated capacity-one appointment resource in the same business is required.',
        );
      let a: Credential;
      if (c.id) {
        await tx.lock(`credential:${c.id}`);
        const old = await this.load(tx, c.id);
        await this.access(c.actorId, old, true);
        if (
          old.organizationId !== c.organizationId ||
          old.professionalId !== c.professionalId ||
          old.resourceId !== c.resourceId
        )
          throw new ApplicationError(
            'CONFLICT',
            'Professional, organization and schedule identity are immutable.',
          );
        a = Credential.restore(old);
        a.expect(c.expectedVersion);
        a.configure(c.profile, this.clock.now());
      } else
        a = Credential.create(
          this.entropy.id(),
          c.organizationId,
          c.professionalId,
          c.resourceId,
          c.profile,
          this.clock.now(),
        );
      return this.record(
        tx,
        a.snapshot(),
        c.actorId,
        c.id ? 'configured' : 'created',
        c.reason,
        c.requestId,
      );
    });
  }
  action(c: CredentialActionCommand) {
    return this.repo.run(async (tx) => {
      const initial = await this.load(tx, c.id);
      await tx.lock(`organization:${initial.organizationId}`);
      await tx.lock(`credential:${c.id}`);
      const s = await this.load(tx, c.id);
      await this.access(c.actorId, s, c.action === 'submit');
      const a = Credential.restore(s);
      a.expect(c.expectedVersion);
      if (c.action === 'submit') {
        await this.professional(s.professionalId, s.organizationId);
        a.submit(this.clock.now());
      } else {
        requireSuperAdmin(await this.actor(c.actorId));
        if (c.action === 'review') {
          if (
            (await this.orgs.membershipsForUser(c.actorId)).some(
              (m) => m.organizationId === s.organizationId,
            )
          )
            throw new ApplicationError(
              'FORBIDDEN',
              'Business members cannot independently review their own evidence.',
            );
          if (c.approved)
            await this.professional(s.professionalId, s.organizationId);
          a.review(
            c.actorId,
            c.approved,
            c.verifiedUntil,
            c.verificationReference,
            this.clock.now(),
          );
        } else a.revoke(this.clock.now());
      }
      return this.record(
        tx,
        a.snapshot(),
        c.actorId,
        c.action,
        c.reason,
        c.requestId,
      );
    });
  }
  upload(c: CredentialDocumentCommand) {
    return this.repo.run(async (tx) => {
      const first = await this.load(tx, c.id);
      await tx.lock(`organization:${first.organizationId}`);
      await tx.lock(`credential:${c.id}`);
      const s = await this.load(tx, c.id);
      await this.access(c.actorId, s, true);
      const a = Credential.restore(s);
      a.expect(c.expectedVersion);
      const image = await this.media.prepare(c.bytes, c.mime);
      const asset = await this.media.store(c.actorId, c.id, image);
      a.document(asset.id, c.kind, this.clock.now());
      return this.record(
        tx,
        a.snapshot(),
        c.actorId,
        'document_added',
        c.reason,
        c.requestId,
      );
    });
  }
  remove(c: CredentialDocumentCommand) {
    return this.repo.run(async (tx) => {
      const first = await this.load(tx, c.id);
      await tx.lock(`organization:${first.organizationId}`);
      await tx.lock(`credential:${c.id}`);
      const s = await this.load(tx, c.id);
      await this.access(c.actorId, s, true);
      const a = Credential.restore(s);
      a.expect(c.expectedVersion);
      if (!c.mediaId)
        throw new ApplicationError(
          'INVALID_INPUT',
          'Document UUID is required.',
        );
      a.remove(c.mediaId, this.clock.now());
      await this.media.remove(c.mediaId, c.id, this.clock.now());
      return this.record(
        tx,
        a.snapshot(),
        c.actorId,
        'document_removed',
        c.reason,
        c.requestId,
      );
    });
  }
  get(q: CredentialQuery) {
    return this.repo.run(async (tx) => {
      const s = await this.load(tx, q.id);
      await this.access(q.actorId, s);
      return s;
    });
  }
  list(q: CredentialsQuery) {
    return this.repo.run(async (tx) => {
      requireSuperAdmin(await this.actor(q.actorId));
      return tx.list(q);
    });
  }
  async document(q: CredentialQuery, id: string) {
    const s = await this.get(q);
    if (!s.documents.some((d) => d.mediaId === id))
      throw new ApplicationError(
        'RESOURCE_NOT_FOUND',
        'Document was not found.',
      );
    return (await this.media.read(id, s.id)).bytes;
  }
  audits(q: CredentialQuery, page: number, limit: number) {
    return this.repo.run(async (tx) => {
      await this.access(q.actorId, await this.load(tx, q.id));
      return tx.audits(q.id, page, limit);
    });
  }
  eligible(id: string, org: string, resource: string, through: Date) {
    return this.repo.run(async (tx) => {
      await tx.lock(`credential:${id}`);
      const s = await this.load(tx, id);
      if (
        s.organizationId !== org ||
        s.resourceId !== resource ||
        !currentCredential(s, through)
      )
        throw new ApplicationError(
          'CONFLICT',
          'Current independently verified veterinary credentials covering the appointment are required.',
        );
      await this.professional(s.professionalId, org);
      return s.verifiedUntil as Date;
    });
  }
}
