import { ApplicationError } from '../../../../shared/domain/application-error';
import { COUNTRY_CODES } from '../../../../shared/domain/profile-details';
import type { PublicAnimal } from '../value-objects/public-animal';
export const PUBLICATION_STATUSES = [
  'draft',
  'pending',
  'published',
  'rejected',
  'paused',
  'closed',
  'deleted',
] as const;
export interface PublicationProfile {
  title: string;
  description: string;
  conditions: string;
  countryCode: string;
  city: string;
}
export interface PublicationState extends PublicationProfile {
  id: string;
  animalId: string;
  organizationId: string;
  status: (typeof PUBLICATION_STATUSES)[number];
  version: number;
  snapshot: PublicAnimal | null;
  createdBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewReason: string | null;
  submittedAt: Date | null;
  publishedAt: Date | null;
  closedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export function validatePublicationProfile(input: Partial<PublicationProfile>) {
  const result = { ...input };
  const limits = {
    title: 150,
    description: 4000,
    conditions: 2000,
    countryCode: 2,
    city: 100,
  };
  for (const [key, value] of Object.entries(input)) {
    if (
      !(key in limits) ||
      typeof value !== 'string' ||
      value.trim().length < 2 ||
      value.trim().length > limits[key as keyof typeof limits] ||
      /\p{Cc}/u.test(value)
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Invalid adoption publication profile.',
      );
    Object.assign(result, { [key]: value.trim() });
  }
  if (result.countryCode && !COUNTRY_CODES.includes(result.countryCode))
    throw new ApplicationError(
      'INVALID_INPUT',
      'Unsupported publication country.',
    );
  return result;
}
export class Publication {
  private constructor(private state: PublicationState) {}
  static create(
    id: string,
    animalId: string,
    organizationId: string,
    actorId: string,
    profile: PublicationProfile,
    now: Date,
  ) {
    const fields = validatePublicationProfile(profile);
    if (Object.values(fields).length !== 5)
      throw new ApplicationError(
        'INVALID_INPUT',
        'A complete publication profile is required.',
      );
    return new Publication({
      ...profile,
      ...fields,
      id,
      animalId,
      organizationId,
      status: 'draft',
      version: 1,
      snapshot: null,
      createdBy: actorId,
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
      submittedAt: null,
      publishedAt: null,
      closedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  static restore(state: PublicationState) {
    return new Publication({ ...state });
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
        'The publication changed. Read its latest version and retry.',
      );
  }
  private mutable() {
    if (['closed', 'deleted'].includes(this.state.status))
      throw new ApplicationError(
        'CONFLICT',
        'Closed publications cannot be modified.',
      );
  }
  private change(fields: Partial<PublicationState>, now: Date) {
    this.state = {
      ...this.state,
      ...fields,
      version: this.state.version + 1,
      updatedAt: now,
    };
  }
  update(profile: Partial<PublicationProfile>, now: Date) {
    this.mutable();
    if (this.state.status === 'pending')
      throw new ApplicationError(
        'CONFLICT',
        'Pending publications cannot be edited.',
      );
    const fields = validatePublicationProfile(profile);
    if (!Object.keys(fields).length)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Provide at least one publication field.',
      );
    if (
      !Object.entries(fields).some(
        ([k, v]) => this.state[k as keyof PublicationState] !== v,
      )
    )
      return false;
    this.change(
      {
        ...fields,
        status: 'draft',
        reviewedAt: null,
        reviewedBy: null,
        reviewReason: null,
      },
      now,
    );
    return true;
  }
  submit(snapshot: PublicAnimal, now: Date) {
    this.mutable();
    if (!['draft', 'rejected', 'paused'].includes(this.state.status))
      throw new ApplicationError(
        'CONFLICT',
        'Only draft, rejected or paused publications can be submitted.',
      );
    if (snapshot.id !== this.state.animalId || !snapshot.photos.length)
      throw new ApplicationError(
        'CONFLICT',
        'At least one animal photo is required before publication review.',
      );
    this.change(
      {
        snapshot,
        status: 'pending',
        submittedAt: now,
        reviewedAt: null,
        reviewedBy: null,
        reviewReason: null,
      },
      now,
    );
  }
  review(approved: boolean, actorId: string, reason: string, now: Date) {
    if (this.state.status !== 'pending' || !this.state.snapshot?.photos.length)
      throw new ApplicationError(
        'CONFLICT',
        'Only pending publications with photos can be reviewed.',
      );
    if (actorId === this.state.createdBy)
      throw new ApplicationError(
        'FORBIDDEN',
        'A publication creator cannot moderate their own publication.',
      );
    this.change(
      {
        status: approved ? 'published' : 'rejected',
        reviewedBy: actorId,
        reviewedAt: now,
        reviewReason: reason,
        ...(approved ? { publishedAt: now } : {}),
      },
      now,
    );
  }
  pause(now: Date) {
    this.mutable();
    if (this.state.status === 'paused') return false;
    if (this.state.status !== 'published')
      throw new ApplicationError(
        'CONFLICT',
        'Only a published listing can be paused.',
      );
    this.change({ status: 'paused' }, now);
    return true;
  }
  close(now: Date) {
    this.mutable();
    if (this.state.status !== 'published')
      throw new ApplicationError(
        'CONFLICT',
        'Only a published listing can complete adoption.',
      );
    this.change({ status: 'closed', closedAt: now }, now);
  }
  archive(now: Date) {
    if (this.state.status === 'deleted') return false;
    this.change({ status: 'deleted', deletedAt: now }, now);
    return true;
  }
  snapshot() {
    return { ...this.state };
  }
}
