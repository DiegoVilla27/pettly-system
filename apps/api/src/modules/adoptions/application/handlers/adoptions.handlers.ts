import type { BusinessNotifications } from '../../../notifications/application/ports/in/business-notifications';
import { ApplicationError } from '../../../../shared/domain/application-error';
import { administrativeReason } from '../../../../shared/domain/authorization';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { UsersDirectory } from '../../../users/application/ports/out/users-directory';
import type { Authorization } from '../../../authorization/application/ports/in/authorization';
import type { OrganizationAccess } from '../../../organizations/application/ports/in/organization-access';
import type { AnimalsCatalog } from '../../../animals/application/ports/in/animals-catalog';
import type { Media } from '../../../media/application/ports/in/media';
import { Publication } from '../../domain/aggregates/publication';
import { AdoptionRequest } from '../../domain/aggregates/adoption-request';
import type { PublicationResult } from '../results/adoption';
import type { AdoptionsUseCases } from '../ports/in/adoptions-use-cases';
import type {
  AdoptionsRepository,
  AdoptionsWork,
} from '../ports/out/adoptions-repository';
import type {
  CreatePublicationCommand,
  PublicationDecisionCommand,
  UpdatePublicationCommand,
  ReviewPublicationCommand,
  SubmitAdoptionRequestCommand,
  AdoptionRequestDecisionCommand,
} from '../commands/adoption.commands';
import type {
  PublicPublicationsQuery,
  OrganizationPublicationsQuery,
  AdoptionRequestsQuery,
} from '../queries/adoption.queries';
export class AdoptionsHandlers implements AdoptionsUseCases {
  constructor(
    private readonly repository: AdoptionsRepository,
    private readonly users: UsersDirectory,
    private readonly authorization: Authorization,
    private readonly organizations: OrganizationAccess,
    private readonly animals: AnimalsCatalog,
    private readonly media: Media,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
    private readonly notices?: BusinessNotifications,
  ) {}
  private async actor(id: string) {
    const user = await this.users.findById(id);
    if (!user || user.status !== 'active' || !user.emailVerifiedAt)
      throw new ApplicationError(
        'FORBIDDEN',
        'An active verified account is required.',
      );
    return user;
  }
  private async load(work: AdoptionsWork, id: string) {
    const state = await work.findPublication(id);
    if (!state)
      throw new ApplicationError(
        'RESOURCE_NOT_FOUND',
        'Publication was not found.',
      );
    return Publication.restore(state);
  }
  private async loadRequest(work: AdoptionsWork, id: string) {
    const state = await work.findRequest(id);
    if (!state)
      throw new ApplicationError(
        'RESOURCE_NOT_FOUND',
        'Adoption request was not found.',
      );
    return AdoptionRequest.restore(state);
  }
  private async eligible(state: PublicationResult, photos = false) {
    const [organization] = await this.organizations.states([
      state.organizationId,
    ]);
    const animal = await this.animals.find(state.animalId);
    if (
      !organization ||
      organization.status !== 'active' ||
      organization.type !== 'adoption_entity' ||
      !animal ||
      animal.status !== 'active' ||
      animal.organizationId !== state.organizationId
    )
      return false;
    if (photos) {
      const [card] = await this.animals.cards([state.animalId]);
      return Boolean(
        card &&
        state.snapshot?.photos.some((photo) =>
          card.card.photos.some((p) => p.mediaId === photo.mediaId),
        ),
      );
    }
    return true;
  }
  private async scope(
    work: AdoptionsWork,
    actorId: string,
    id: string,
    permission:
      | 'adoptions.publications.manage'
      | 'adoptions.requests.review'
      | 'moderation.publications.review',
    applicantId?: string,
  ) {
    for (const user of [
      ...new Set([actorId, ...(applicantId ? [applicantId] : [])]),
    ].sort())
      await work.lock(`user:${user}`);
    const initial = (await this.load(work, id)).snapshot();
    await work.lock(`organization:${initial.organizationId}`);
    await work.lock(`animal:${initial.animalId}`);
    await work.lock(`publication:${id}`);
    const publication = await this.load(work, id);
    if (permission === 'moderation.publications.review') {
      await this.authorization.requirePermission(actorId, permission);
      if (!(await this.eligible(publication.snapshot())))
        throw new ApplicationError(
          'CONFLICT',
          'An active adoption entity and animal are required.',
        );
    } else
      await this.authorization.requirePermission(
        actorId,
        permission,
        initial.organizationId,
      );
    return publication;
  }
  private async audit(
    work: AdoptionsWork,
    actorId: string,
    id: string,
    action: string,
    reason: string,
    correlationId: string,
    requestId: string | null = null,
  ) {
    const auditId = this.entropy.id();
    await work.audit({
      id: auditId,
      actorId,
      publicationId: id,
      requestId,
      action,
      reason: administrativeReason(reason),
      correlationId,
      createdAt: this.clock.now(),
    });
    if (this.notices && requestId) {
      const r = await work.findRequest(requestId),
        p = await work.findPublication(id);
      if (r && p) {
        const org = await this.organizations.findOrganization(p.organizationId);
        await this.notices.publish({
          eventKey: auditId,
          category: 'adoptions',
          eventType: action,
          subjectType: 'adoption_request',
          subjectId: r.id,
          subjectVersion: r.version,
          status: r.status,
          recipientIds: [
            r.applicantId,
            ...(org?.responsibleUserId ? [org.responsibleUserId] : []),
          ],
          now: this.clock.now(),
        });
      }
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
  create(command: CreatePublicationCommand) {
    const reason = administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      await work.lock(`user:${command.actorId}`);
      const animal = await this.animals.find(command.animalId);
      if (!animal || !animal.organizationId || animal.status !== 'active')
        throw new ApplicationError(
          'CONFLICT',
          'An active shelter animal is required.',
        );
      await work.lock(`organization:${animal.organizationId}`);
      await work.lock(`animal:${animal.id}`);
      await this.authorization.requirePermission(
        command.actorId,
        'adoptions.publications.manage',
        animal.organizationId,
      );
      const current = await this.animals.find(animal.id);
      if (current?.status !== 'active')
        throw new ApplicationError(
          'CONFLICT',
          'An active shelter animal is required.',
        );
      const state = Publication.create(
        this.entropy.id(),
        animal.id,
        animal.organizationId,
        command.actorId,
        command.profile,
        this.clock.now(),
      ).snapshot();
      await work.createPublication(state);
      await this.audit(
        work,
        command.actorId,
        state.id,
        'publication.created',
        reason,
        command.requestId,
      );
      return state;
    });
  }
  get(actorId: string, id: string) {
    return this.repository.run(async (work) => {
      const state = (await this.load(work, id)).snapshot();
      const actor = await this.actor(actorId);
      if (['moderator', 'super_admin'].includes(actor.globalRole))
        await this.authorization.requirePermission(
          actorId,
          'moderation.publications.review',
        );
      else
        await this.authorization.requirePermission(
          actorId,
          'adoptions.publications.manage',
          state.organizationId,
        );
      return state;
    });
  }
  moderation(actorId: string, page: number, limit: number) {
    this.page(page, limit);
    return this.repository.run(async (work) => {
      await this.authorization.requirePermission(
        actorId,
        'moderation.publications.review',
      );
      return work.pendingPublications(page, limit);
    });
  }
  list(query: OrganizationPublicationsQuery) {
    this.page(query.page, query.limit);
    return this.repository.run(async (work) => {
      await this.authorization.requirePermission(
        query.actorId,
        'adoptions.publications.manage',
        query.organizationId,
      );
      return work.publications(query);
    });
  }
  update(command: UpdatePublicationCommand) {
    return this.repository.run(async (work) => {
      const publication = await this.scope(
        work,
        command.actorId,
        command.publicationId,
        'adoptions.publications.manage',
      );
      publication.expectVersion(command.expectedVersion);
      if (publication.update(command.profile, this.clock.now())) {
        await work.savePublication(publication.snapshot());
        await this.audit(
          work,
          command.actorId,
          command.publicationId,
          'publication.updated',
          command.reason,
          command.requestId,
        );
      }
      return publication.snapshot();
    });
  }
  submit(command: PublicationDecisionCommand) {
    return this.repository.run(async (work) => {
      const publication = await this.scope(
        work,
        command.actorId,
        command.publicationId,
        'adoptions.publications.manage',
      );
      publication.expectVersion(command.expectedVersion);
      if (!(await this.eligible(publication.snapshot())))
        throw new ApplicationError(
          'CONFLICT',
          'An active shelter animal is required.',
        );
      const [entry] = await this.animals.cards([
        publication.snapshot().animalId,
      ]);
      publication.submit(entry.card, this.clock.now());
      await work.savePublication(publication.snapshot());
      await this.audit(
        work,
        command.actorId,
        command.publicationId,
        'publication.submitted',
        command.reason,
        command.requestId,
      );
      return publication.snapshot();
    });
  }
  review(command: ReviewPublicationCommand) {
    return this.repository.run(async (work) => {
      const publication = await this.scope(
        work,
        command.actorId,
        command.publicationId,
        'moderation.publications.review',
      );
      publication.expectVersion(command.expectedVersion);
      if (
        command.approved &&
        !(await this.eligible(publication.snapshot(), true))
      )
        throw new ApplicationError(
          'CONFLICT',
          'An attached publication photo is required.',
        );
      const memberships = await this.organizations.membershipsForUser(
        command.actorId,
      );
      if (
        memberships.some(
          (m) => m.organizationId === publication.snapshot().organizationId,
        )
      )
        throw new ApplicationError(
          'FORBIDDEN',
          'Organization members cannot moderate their own entity publications.',
        );
      publication.review(
        command.approved,
        command.actorId,
        administrativeReason(command.reason),
        this.clock.now(),
      );
      await work.savePublication(publication.snapshot());
      await this.audit(
        work,
        command.actorId,
        command.publicationId,
        command.approved ? 'publication.approved' : 'publication.rejected',
        command.reason,
        command.requestId,
      );
      return publication.snapshot();
    });
  }
  pause(command: PublicationDecisionCommand) {
    return this.repository.run(async (work) => {
      const publication = await this.scope(
        work,
        command.actorId,
        command.publicationId,
        'adoptions.publications.manage',
      );
      publication.expectVersion(command.expectedVersion);
      if (publication.pause(this.clock.now())) {
        await work.savePublication(publication.snapshot());
        await this.audit(
          work,
          command.actorId,
          command.publicationId,
          'publication.paused',
          command.reason,
          command.requestId,
        );
      }
      return publication.snapshot();
    });
  }
  private async closeOthers(
    work: AdoptionsWork,
    actorId: string,
    id: string,
    reason: string,
    correlationId: string,
    except?: string,
  ) {
    for (const state of await work.openRequests(id)) {
      if (state.id === except) continue;
      const request = AdoptionRequest.restore(state);
      if (request.close(this.clock.now())) {
        await work.saveRequest(request.snapshot());
        await this.audit(
          work,
          actorId,
          id,
          'request.closed',
          reason,
          correlationId,
          state.id,
        );
      }
    }
  }
  archive(command: PublicationDecisionCommand) {
    return this.repository.run(async (work) => {
      const publication = await this.scope(
        work,
        command.actorId,
        command.publicationId,
        'adoptions.publications.manage',
      );
      if (publication.snapshot().status === 'deleted') return;
      publication.expectVersion(command.expectedVersion);
      publication.archive(this.clock.now());
      await work.savePublication(publication.snapshot());
      await this.closeOthers(
        work,
        command.actorId,
        command.publicationId,
        command.reason,
        command.requestId,
      );
      await this.audit(
        work,
        command.actorId,
        command.publicationId,
        'publication.deleted',
        command.reason,
        command.requestId,
      );
    });
  }
  private projection(state: PublicationResult) {
    return {
      id: state.id,
      version: state.version,
      animalId: state.animalId,
      organizationId: state.organizationId,
      title: state.title,
      description: state.description,
      conditions: state.conditions,
      countryCode: state.countryCode,
      city: state.city,
      publishedAt: state.publishedAt,
      snapshot: state.snapshot,
    };
  }
  async publicList(query: PublicPublicationsQuery) {
    if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 50)
      throw new ApplicationError('INVALID_INPUT', 'Invalid public page limit.');
    return this.repository.run(async (work) => {
      const candidates = await work.publicCandidates(query);
      const [organizations, animals] = await Promise.all([
        this.organizations.states([
          ...new Set(candidates.items.map((p) => p.organizationId)),
        ]),
        this.animals.cards([
          ...new Set(candidates.items.map((p) => p.animalId)),
        ]),
      ]);
      const organizationMap = new Map(organizations.map((o) => [o.id, o])),
        animalMap = new Map(animals.map((a) => [a.animal.id, a]));
      const items = [];
      let last: string | null = null;
      for (const state of candidates.items) {
        last = state.id;
        const organization = organizationMap.get(state.organizationId),
          current = animalMap.get(state.animalId);
        const photos =
          state.snapshot?.photos.filter((p) =>
            current?.card.photos.some((photo) => photo.mediaId === p.mediaId),
          ) ?? [];
        if (
          organization?.status === 'active' &&
          organization.type === 'adoption_entity' &&
          current?.animal.status === 'active' &&
          current.animal.organizationId === state.organizationId &&
          photos.length
        ) {
          items.push(
            this.projection({
              ...state,
              snapshot: state.snapshot ? { ...state.snapshot, photos } : null,
            }),
          );
        }
        if (items.length === query.limit) break;
      }
      return {
        items,
        nextCursor: items.length === query.limit ? last : candidates.nextCursor,
      };
    });
  }
  publicGet(id: string) {
    return this.repository.run(async (work) => {
      const publication = await this.load(work, id);
      const state = publication.snapshot();
      if (state.status !== 'published' || !(await this.eligible(state, true)))
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Publication was not found.',
        );
      const [current] = await this.animals.cards([state.animalId]);
      return this.projection({
        ...state,
        snapshot: state.snapshot
          ? {
              ...state.snapshot,
              photos: state.snapshot.photos.filter((p) =>
                current.card.photos.some(
                  (photo) => photo.mediaId === p.mediaId,
                ),
              ),
            }
          : null,
      });
    });
  }
  publicPhoto(id: string, mediaId: string) {
    return this.repository.run(async (work) => {
      const initial = (await this.load(work, id)).snapshot();
      await work.lock(`organization:${initial.organizationId}`);
      await work.lock(`animal:${initial.animalId}`);
      const publication = await this.publicGet(id);
      if (!publication.snapshot?.photos.some((p) => p.mediaId === mediaId))
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Photo was not found.',
        );
      return (await this.media.read(mediaId, publication.animalId)).bytes;
    });
  }
  apply(command: SubmitAdoptionRequestCommand) {
    return this.repository.run(async (work) => {
      await work.lock(`user:${command.actorId}`);
      const user = await this.actor(command.actorId);
      if (!user.phone || !user.countryCode || !user.city)
        throw new ApplicationError(
          'CONFLICT',
          'Complete your contact phone, country and city before applying.',
        );
      const initial = (await this.load(work, command.publicationId)).snapshot();
      await work.lock(`organization:${initial.organizationId}`);
      await work.lock(`animal:${initial.animalId}`);
      await work.lock(`publication:${initial.id}`);
      const state = (await this.load(work, initial.id)).snapshot();
      if (state.status !== 'published' || !(await this.eligible(state, true)))
        throw new ApplicationError(
          'CONFLICT',
          'This publication is unavailable for applications.',
        );
      if (
        (await this.organizations.membershipsForUser(command.actorId)).some(
          (m) => m.organizationId === state.organizationId,
        )
      )
        throw new ApplicationError(
          'FORBIDDEN',
          'Organization members cannot apply to their own entity.',
        );
      if (state.version !== command.expectedPublicationVersion)
        throw new ApplicationError(
          'CONFLICT',
          'The listing changed. Read the current publication before consenting.',
        );
      const request = AdoptionRequest.create(
        this.entropy.id(),
        state.id,
        command.actorId,
        command.message,
        command.consent,
        this.clock.now(),
        state.version,
        state.conditions,
      ).snapshot();
      await work.createRequest(request);
      await this.audit(
        work,
        command.actorId,
        state.id,
        'request.submitted',
        'Applicant accepted adoption conditions and consented to share current contact details.',
        command.requestId,
        request.id,
      );
      return request;
    });
  }
  requests(query: AdoptionRequestsQuery) {
    this.page(query.page, query.limit);
    return this.repository.run(async (work) => {
      await this.actor(query.actorId);
      if (query.publicationId) {
        const publication = (
          await this.load(work, query.publicationId)
        ).snapshot();
        await this.authorization.requirePermission(
          query.actorId,
          'adoptions.requests.review',
          publication.organizationId,
        );
      }
      return work.requests(query);
    });
  }
  request(actorId: string, id: string) {
    return this.repository.run(async (work) => {
      await this.actor(actorId);
      const state = (await this.loadRequest(work, id)).snapshot();
      if (state.applicantId !== actorId) {
        const publication = (
          await this.load(work, state.publicationId)
        ).snapshot();
        await this.authorization.requirePermission(
          actorId,
          'adoptions.requests.review',
          publication.organizationId,
        );
      }
      const user = await this.users.findById(state.applicantId);
      const contact =
        user && user.status !== 'deleted'
          ? {
              name: user.name,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone,
              countryCode: user.countryCode,
              city: user.city,
            }
          : null;
      return { ...state, contact };
    });
  }
  reviewRequest(command: AdoptionRequestDecisionCommand) {
    return this.repository.run(async (work) => {
      const initial = (
        await this.loadRequest(work, command.adoptionRequestId)
      ).snapshot();
      const publication = await this.scope(
        work,
        command.actorId,
        initial.publicationId,
        'adoptions.requests.review',
        initial.applicantId,
      );
      await work.lock(`adoption-request:${initial.id}`);
      const request = await this.loadRequest(work, initial.id);
      request.expectVersion(command.expectedVersion);
      if (
        publication.snapshot().status !== 'published' ||
        !(await this.eligible(publication.snapshot(), true))
      )
        throw new ApplicationError(
          'CONFLICT',
          'Only an available published listing can process requests.',
        );
      if (
        command.status !== 'rejected' &&
        request.snapshot().conditionsAccepted !==
          publication.snapshot().conditions
      )
        throw new ApplicationError(
          'CONFLICT',
          'Adoption conditions changed. The applicant must withdraw and submit new consent.',
        );
      if (command.status === 'approved') await this.actor(initial.applicantId);
      if (!command.status)
        throw new ApplicationError(
          'INVALID_INPUT',
          'Review status is required.',
        );
      if (
        request.review(
          command.status,
          command.actorId,
          administrativeReason(command.reason),
          this.clock.now(),
        )
      ) {
        await work.saveRequest(request.snapshot());
        await this.audit(
          work,
          command.actorId,
          initial.publicationId,
          'request.reviewed',
          command.reason,
          command.requestId,
          initial.id,
        );
      }
      return request.snapshot();
    });
  }
  withdraw(command: AdoptionRequestDecisionCommand) {
    return this.repository.run(async (work) => {
      await work.lock(`user:${command.actorId}`);
      await this.actor(command.actorId);
      const initial = (
        await this.loadRequest(work, command.adoptionRequestId)
      ).snapshot();
      if (initial.applicantId !== command.actorId)
        throw new ApplicationError(
          'FORBIDDEN',
          'Only the applicant may withdraw their request.',
        );
      const publication = (
        await this.load(work, initial.publicationId)
      ).snapshot();
      await work.lock(`organization:${publication.organizationId}`);
      await work.lock(`animal:${publication.animalId}`);
      await work.lock(`publication:${publication.id}`);
      const request = await this.loadRequest(work, initial.id);
      if (request.snapshot().status === 'withdrawn') return request.snapshot();
      request.expectVersion(command.expectedVersion);
      if (request.withdraw(this.clock.now())) {
        await work.saveRequest(request.snapshot());
        await this.audit(
          work,
          command.actorId,
          initial.publicationId,
          'request.withdrawn',
          command.reason,
          command.requestId,
          initial.id,
        );
      }
      return request.snapshot();
    });
  }
  complete(command: AdoptionRequestDecisionCommand) {
    return this.repository.run(async (work) => {
      const initial = (
        await this.loadRequest(work, command.adoptionRequestId)
      ).snapshot();
      const publication = await this.scope(
        work,
        command.actorId,
        initial.publicationId,
        'adoptions.requests.review',
        initial.applicantId,
      );
      await work.lock(`adoption-request:${initial.id}`);
      const request = await this.loadRequest(work, initial.id);
      request.expectVersion(command.expectedVersion);
      if (
        publication.snapshot().status !== 'published' ||
        !(await this.eligible(publication.snapshot(), true))
      )
        throw new ApplicationError(
          'CONFLICT',
          'An available published listing is required to complete adoption.',
        );
      await this.actor(initial.applicantId);
      if (
        request.snapshot().conditionsAccepted !==
        publication.snapshot().conditions
      )
        throw new ApplicationError(
          'CONFLICT',
          'Adoption conditions changed. Renewed applicant consent is required.',
        );
      request.complete(
        command.actorId,
        administrativeReason(command.reason),
        this.clock.now(),
      );
      publication.close(this.clock.now());
      await this.animals.completeAdoption(
        command.actorId,
        publication.snapshot().animalId,
        command.reason,
        command.requestId,
      );
      await work.saveRequest(request.snapshot());
      await work.savePublication(publication.snapshot());
      await this.closeOthers(
        work,
        command.actorId,
        publication.snapshot().id,
        command.reason,
        command.requestId,
        initial.id,
      );
      await this.audit(
        work,
        command.actorId,
        initial.publicationId,
        'request.completed',
        command.reason,
        command.requestId,
        initial.id,
      );
      await this.audit(
        work,
        command.actorId,
        initial.publicationId,
        'publication.closed',
        command.reason,
        command.requestId,
      );
      return request.snapshot();
    });
  }
  audits(actorId: string, id: string, page: number, limit: number) {
    this.page(page, limit);
    return this.repository.run(async (work) => {
      const publication = (await this.load(work, id)).snapshot();
      await this.authorization.requirePermission(
        actorId,
        'adoptions.publications.manage',
        publication.organizationId,
      );
      return work.audits(id, page, limit);
    });
  }
}
