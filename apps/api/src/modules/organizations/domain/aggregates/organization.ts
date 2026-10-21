import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  ORGANIZATION_TYPES,
  type OrganizationType,
} from '../../../../shared/domain/authorization';
import type { OrganizationStatus } from '../../../../shared/domain/organization-state';
import {
  EMPTY_PROFILE,
  validateOrganizationProfile,
  requireCompleteProfile,
  type OrganizationProfile,
  type OrganizationProfileChanges,
} from '../value-objects/organization-profile';
export interface OrganizationState extends OrganizationProfile {
  id: string;
  type: OrganizationType;
  status: OrganizationStatus;
  version: number;
  applicantId: string | null;
  responsibleUserId: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewReason: string | null;
  approvedAt: Date | null;
  suspendedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export class Organization {
  private constructor(private state: OrganizationState) {}
  static create(
    id: string,
    name: string,
    type: OrganizationType,
    now: Date,
    profile: OrganizationProfileChanges = {},
    applicantId: string | null = null,
  ) {
    if (typeof name !== 'string' || !name.trim())
      throw new ApplicationError(
        'INVALID_INPUT',
        'An organization name is required.',
      );
    if (!ORGANIZATION_TYPES.includes(type))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Unsupported organization type.',
      );
    const fields = validateOrganizationProfile({ ...profile, name });
    return new Organization({
      ...EMPTY_PROFILE,
      ...fields,
      name: fields.name!,
      id,
      type,
      status: 'draft',
      version: 1,
      applicantId,
      responsibleUserId: null,
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      reviewReason: null,
      approvedAt: null,
      suspendedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  static restore(state: OrganizationState) {
    return new Organization({ ...state });
  }
  expectVersion(version: number) {
    if (!Number.isInteger(version) || version < 1)
      throw new ApplicationError(
        'INVALID_INPUT',
        'A positive expectedVersion is required.',
      );
    if (this.state.version !== version)
      throw new ApplicationError(
        'CONFLICT',
        'The organization changed. Read its latest version and retry.',
      );
  }
  private mutable() {
    if (this.state.status === 'deleted')
      throw new ApplicationError(
        'CONFLICT',
        'An archived organization cannot be modified.',
      );
  }
  private change(values: Partial<OrganizationState>, now: Date) {
    this.state = {
      ...this.state,
      ...values,
      version: this.state.version + 1,
      updatedAt: now,
    };
  }
  updateProfile(
    input: OrganizationProfileChanges,
    now: Date,
    administrator: boolean,
  ) {
    this.mutable();
    if (!administrator && ['pending', 'suspended'].includes(this.state.status))
      throw new ApplicationError(
        'CONFLICT',
        'Profile edits are unavailable while pending or suspended.',
      );
    const fields = validateOrganizationProfile(input);
    if (!Object.keys(fields).length)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Provide at least one profile field.',
      );
    if (
      !Object.entries(fields).some(
        ([key, value]) => this.state[key as keyof OrganizationState] !== value,
      )
    )
      return false;
    const profile = { ...this.state, ...fields };
    const legalChanged = [
      'legalName',
      'registrationNumber',
      'countryCode',
    ].some(
      (key) =>
        key in fields &&
        fields[key as keyof OrganizationProfile] !==
          this.state[key as keyof OrganizationProfile],
    );
    if (['active', 'pending', 'suspended'].includes(this.state.status))
      requireCompleteProfile(profile);
    const review =
      ['active', 'suspended'].includes(this.state.status) && legalChanged;
    this.change(
      {
        ...fields,
        ...(review
          ? {
              status: 'pending' as const,
              suspendedAt: null,
              submittedAt: now,
              reviewedAt: null,
              reviewedBy: null,
              reviewReason: null,
            }
          : {}),
      },
      now,
    );
    return true;
  }
  submit(now: Date) {
    this.mutable();
    if (!['draft', 'rejected'].includes(this.state.status))
      throw new ApplicationError(
        'CONFLICT',
        'Only a draft or rejected request can be submitted.',
      );
    requireCompleteProfile(this.state);
    this.change(
      {
        status: 'pending',
        submittedAt: now,
        reviewedAt: null,
        reviewedBy: null,
        reviewReason: null,
      },
      now,
    );
  }
  review(
    approved: boolean,
    actorId: string,
    reason: string,
    responsibleUserId: string | null,
    now: Date,
  ) {
    this.mutable();
    if (this.state.status !== 'pending')
      throw new ApplicationError(
        'CONFLICT',
        'Only a pending organization can be reviewed.',
      );
    if (approved) {
      requireCompleteProfile(this.state);
      if (!responsibleUserId)
        throw new ApplicationError(
          'CONFLICT',
          'An approved organization requires a responsible account.',
        );
    }
    this.change(
      {
        status: approved ? 'active' : 'rejected',
        reviewedAt: now,
        reviewedBy: actorId,
        reviewReason: reason,
        ...(approved
          ? { responsibleUserId, approvedAt: now, suspendedAt: null }
          : {}),
      },
      now,
    );
  }
  setStatus(status: 'active' | 'suspended', now: Date) {
    this.mutable();
    if (status !== 'active' && status !== 'suspended')
      throw new ApplicationError(
        'INVALID_INPUT',
        'Unsupported operational status.',
      );
    if (!['active', 'suspended'].includes(this.state.status))
      throw new ApplicationError(
        'CONFLICT',
        'Operational status is only available after approval.',
      );
    if (status === this.state.status) return false;
    if (status === 'active') requireCompleteProfile(this.state);
    this.change(
      { status, suspendedAt: status === 'suspended' ? now : null },
      now,
    );
    return true;
  }
  setResponsible(userId: string, now: Date) {
    this.mutable();
    if (!['active', 'suspended'].includes(this.state.status))
      throw new ApplicationError(
        'CONFLICT',
        'A responsible account is assigned during or after approval.',
      );
    if (userId === this.state.responsibleUserId) return false;
    this.change({ responsibleUserId: userId }, now);
    return true;
  }
  archive(now: Date) {
    if (this.state.status === 'deleted') return false;
    this.change(
      {
        ...EMPTY_PROFILE,
        name: 'Archived organization',
        status: 'deleted',
        deletedAt: now,
        suspendedAt: null,
        reviewReason: null,
      },
      now,
    );
    return true;
  }
  snapshot(): OrganizationState {
    return { ...this.state };
  }
}
