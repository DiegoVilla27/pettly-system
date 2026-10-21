import { ApplicationError } from '../../../shared/domain/application-error';
export const CREDENTIAL_STATUSES = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'revoked',
] as const;
export const PROFESSIONS = [
  'veterinarian',
  'veterinarian_zootechnician',
] as const;
export interface CredentialProfile {
  profession: (typeof PROFESSIONS)[number];
  registrationNumber: string;
  university: string;
  consent: boolean;
}
export interface CredentialState extends CredentialProfile {
  id: string;
  organizationId: string;
  professionalId: string;
  resourceId: string;
  version: number;
  status: (typeof CREDENTIAL_STATUSES)[number];
  documents: {
    mediaId: string;
    kind: 'professional_card' | 'qualification' | 'standing_certificate';
  }[];
  reviewedBy: string | null;
  reviewedAt: Date | null;
  verifiedUntil: Date | null;
  verificationReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export function validateProfile(p: CredentialProfile) {
  if (
    !PROFESSIONS.includes(p.profession) ||
    !/^\d{1,15}$/.test(p.registrationNumber) ||
    p.university.trim().length < 2 ||
    p.university.length > 150 ||
    /\p{Cc}/u.test(p.university) ||
    p.consent !== true
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'Recognized veterinary qualification, numeric professional registration and explicit document-processing consent are required.',
    );
  return { ...p, university: p.university.trim() };
}
export class Credential {
  private constructor(private readonly state: CredentialState) {}
  static create(
    id: string,
    org: string,
    professional: string,
    resource: string,
    p: CredentialProfile,
    now: Date,
  ) {
    return new Credential({
      ...validateProfile(p),
      id,
      organizationId: org,
      professionalId: professional,
      resourceId: resource,
      version: 1,
      status: 'draft',
      documents: [],
      reviewedBy: null,
      reviewedAt: null,
      verifiedUntil: null,
      verificationReference: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  static restore(s: CredentialState) {
    return new Credential(structuredClone(s));
  }
  snapshot() {
    return structuredClone(this.state);
  }
  expect(version: number) {
    if (version !== this.state.version)
      throw new ApplicationError(
        'CONFLICT',
        'Credential changed. Read its current version.',
      );
  }
  private touch(now: Date) {
    this.state.version++;
    this.state.updatedAt = now;
  }
  configure(p: CredentialProfile, now: Date) {
    if (this.state.status === 'pending')
      throw new ApplicationError(
        'CONFLICT',
        'Pending evidence cannot be edited.',
      );
    Object.assign(this.state, validateProfile(p), {
      status: 'draft',
      reviewedBy: null,
      reviewedAt: null,
      verifiedUntil: null,
      verificationReference: null,
    });
    this.touch(now);
  }
  document(
    mediaId: string,
    kind: CredentialState['documents'][number]['kind'],
    now: Date,
  ) {
    if (this.state.status === 'pending' || this.state.documents.length >= 6)
      throw new ApplicationError(
        'CONFLICT',
        'Mutable evidence and at most six sanitized document images are required.',
      );
    this.state.documents.push({ mediaId, kind });
    this.state.status = 'draft';
    this.state.verifiedUntil = null;
    this.state.reviewedBy = null;
    this.state.reviewedAt = null;
    this.state.verificationReference = null;
    this.touch(now);
  }
  remove(mediaId: string, now: Date) {
    if (
      this.state.status === 'pending' ||
      !this.state.documents.some((d) => d.mediaId === mediaId)
    )
      throw new ApplicationError(
        'CONFLICT',
        'Pending or missing evidence cannot be removed.',
      );
    this.state.documents = this.state.documents.filter(
      (d) => d.mediaId !== mediaId,
    );
    this.state.status = 'draft';
    this.state.verifiedUntil = null;
    this.state.reviewedBy = null;
    this.state.reviewedAt = null;
    this.state.verificationReference = null;
    this.touch(now);
  }
  submit(now: Date) {
    if (
      this.state.status === 'pending' ||
      !['professional_card', 'qualification', 'standing_certificate'].every(
        (k) => this.state.documents.some((d) => d.kind === k),
      )
    )
      throw new ApplicationError(
        'CONFLICT',
        'Current card, qualification and standing certificate images are required.',
      );
    this.state.status = 'pending';
    this.state.verifiedUntil = null;
    this.touch(now);
  }
  review(
    actor: string,
    approved: boolean,
    until: Date | null,
    reference: string | null,
    now: Date,
  ) {
    if (this.state.status !== 'pending')
      throw new ApplicationError(
        'CONFLICT',
        'Only pending credentials can be reviewed.',
      );
    if (actor === this.state.professionalId)
      throw new ApplicationError(
        'FORBIDDEN',
        'Professionals cannot review their own credentials.',
      );
    if (
      approved &&
      (!until ||
        !Number.isFinite(+until) ||
        until <= now ||
        +until > +now + 90 * 86400000 ||
        !reference ||
        reference.length < 10 ||
        reference.length > 500 ||
        /\p{Cc}/u.test(reference))
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Approval requires documented official-register verification and a future recheck deadline within ninety days.',
      );
    Object.assign(this.state, {
      status: approved ? 'approved' : 'rejected',
      reviewedBy: actor,
      reviewedAt: now,
      verifiedUntil: approved ? until : null,
      verificationReference: approved ? reference : null,
    });
    this.touch(now);
  }
  revoke(now: Date) {
    if (this.state.status === 'revoked')
      throw new ApplicationError('CONFLICT', 'Credential is already revoked.');
    this.state.status = 'revoked';
    this.state.verifiedUntil = null;
    this.touch(now);
  }
}
export function currentCredential(s: CredentialState, through: Date) {
  return (
    s.status === 'approved' && !!s.verifiedUntil && s.verifiedUntil > through
  );
}
