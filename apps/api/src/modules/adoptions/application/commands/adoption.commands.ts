import type { PublicationProfile } from '../results/adoption';
export class CreatePublicationCommand {
  constructor(
    readonly actorId: string,
    readonly animalId: string,
    readonly profile: PublicationProfile,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
export class PublicationDecisionCommand {
  constructor(
    readonly actorId: string,
    readonly publicationId: string,
    readonly expectedVersion: number,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
export class UpdatePublicationCommand extends PublicationDecisionCommand {
  constructor(
    actorId: string,
    publicationId: string,
    expectedVersion: number,
    reason: string,
    requestId: string,
    readonly profile: Partial<PublicationProfile>,
  ) {
    super(actorId, publicationId, expectedVersion, reason, requestId);
  }
}
export class ReviewPublicationCommand extends PublicationDecisionCommand {
  constructor(
    actorId: string,
    publicationId: string,
    expectedVersion: number,
    reason: string,
    requestId: string,
    readonly approved: boolean,
  ) {
    super(actorId, publicationId, expectedVersion, reason, requestId);
  }
}
export class SubmitAdoptionRequestCommand {
  constructor(
    readonly actorId: string,
    readonly publicationId: string,
    readonly message: string,
    readonly consent: boolean,
    readonly requestId: string,
    readonly expectedPublicationVersion: number,
  ) {}
}
export class AdoptionRequestDecisionCommand {
  constructor(
    readonly actorId: string,
    readonly adoptionRequestId: string,
    readonly expectedVersion: number,
    readonly reason: string,
    readonly requestId: string,
    readonly status?: 'in_review' | 'approved' | 'rejected',
  ) {}
}
