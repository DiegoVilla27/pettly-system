import { ApplicationError } from '../../../../shared/domain/application-error';
export const REQUEST_STATUSES = [
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'withdrawn',
  'completed',
  'closed',
] as const;
export interface AdoptionRequestState {
  id: string;
  publicationId: string;
  applicantId: string;
  message: string;
  consentedAt: Date;
  publicationVersion: number;
  conditionsAccepted: string;
  status: (typeof REQUEST_STATUSES)[number];
  version: number;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewReason: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export class AdoptionRequest {
  private constructor(private state: AdoptionRequestState) {}
  static create(
    id: string,
    publicationId: string,
    applicantId: string,
    message: string,
    consent: boolean,
    now: Date,
    publicationVersion: number,
    conditionsAccepted: string,
  ) {
    if (
      consent !== true ||
      typeof message !== 'string' ||
      message.trim().length < 10 ||
      message.trim().length > 2000 ||
      /\p{Cc}/u.test(message)
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Explicit contact/conditions consent and a 10–2000 character message are required.',
      );
    if (
      !Number.isInteger(publicationVersion) ||
      publicationVersion < 1 ||
      typeof conditionsAccepted !== 'string' ||
      conditionsAccepted.length < 2 ||
      conditionsAccepted.length > 2000
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Current publication conditions must be recorded with consent.',
      );
    return new AdoptionRequest({
      id,
      publicationId,
      applicantId,
      message: message.trim(),
      consentedAt: now,
      publicationVersion,
      conditionsAccepted,
      status: 'submitted',
      version: 1,
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  static restore(state: AdoptionRequestState) {
    return new AdoptionRequest({ ...state });
  }
  expectVersion(version: number) {
    if (!Number.isInteger(version) || version < 1)
      throw new ApplicationError(
        'INVALID_INPUT',
        'A positive expectedVersion is required.',
      );
    if (version !== this.state.version)
      throw new ApplicationError(
        'CONFLICT',
        'The adoption request changed. Read its latest version and retry.',
      );
  }
  private change(fields: Partial<AdoptionRequestState>, now: Date) {
    this.state = {
      ...this.state,
      ...fields,
      version: this.state.version + 1,
      updatedAt: now,
    };
  }
  review(
    status: 'in_review' | 'approved' | 'rejected',
    actorId: string,
    reason: string,
    now: Date,
  ) {
    if (actorId === this.state.applicantId)
      throw new ApplicationError(
        'FORBIDDEN',
        'Applicants cannot review their own request.',
      );
    if (!['submitted', 'in_review', 'approved'].includes(this.state.status))
      throw new ApplicationError('CONFLICT', 'This request is no longer open.');
    if (!['in_review', 'approved', 'rejected'].includes(status))
      throw new ApplicationError('INVALID_INPUT', 'Unsupported review state.');
    if (status === this.state.status) return false;
    if (status === 'in_review' && this.state.status !== 'submitted')
      throw new ApplicationError(
        'CONFLICT',
        'Only a submitted request can enter review.',
      );
    this.change(
      { status, reviewedBy: actorId, reviewedAt: now, reviewReason: reason },
      now,
    );
    return true;
  }
  withdraw(now: Date) {
    if (this.state.status === 'withdrawn') return false;
    if (!['submitted', 'in_review', 'approved'].includes(this.state.status))
      throw new ApplicationError(
        'CONFLICT',
        'This request cannot be withdrawn.',
      );
    this.change({ status: 'withdrawn' }, now);
    return true;
  }
  complete(actorId: string, reason: string, now: Date) {
    if (this.state.status !== 'approved')
      throw new ApplicationError(
        'CONFLICT',
        'Only an approved request can complete adoption.',
      );
    if (actorId === this.state.applicantId)
      throw new ApplicationError(
        'FORBIDDEN',
        'Applicants cannot confirm their own adoption.',
      );
    this.change(
      {
        status: 'completed',
        completedAt: now,
        reviewedBy: actorId,
        reviewedAt: now,
        reviewReason: reason,
      },
      now,
    );
  }
  close(now: Date) {
    if (!['submitted', 'in_review', 'approved'].includes(this.state.status))
      return false;
    this.change(
      {
        status: 'closed',
        reviewReason: 'The publication closed before this request completed.',
      },
      now,
    );
    return true;
  }
  snapshot() {
    return { ...this.state };
  }
}
