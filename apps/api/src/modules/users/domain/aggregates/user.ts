import { ApplicationError } from '../../../../shared/domain/application-error';
import { Email } from '../../../../shared/domain/email';
import {
  validateProfile,
  type ProfileDetails,
  type ProfileChanges,
  type NewProfile,
} from '../value-objects/profile-details';
export type UserStatus = 'active' | 'disabled' | 'deleted';
import {
  GLOBAL_ROLES,
  type GlobalRole,
} from '../../../../shared/domain/authorization';
export type { GlobalRole } from '../../../../shared/domain/authorization';
export interface UserState extends ProfileDetails {
  id: string;
  email: string;
  status: UserStatus;
  globalRole: GlobalRole;
  emailVerifiedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export class User {
  private constructor(private state: UserState) {}
  static create(
    id: string,
    email: string,
    profile: NewProfile,
    now: Date,
  ): User {
    if (!profile.name || !profile.lastName)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Given name and family name are required.',
      );
    const fields = validateProfile(profile, now);
    if (!fields.name || !fields.lastName)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Given name and family name are required.',
      );
    return new User({
      id,
      email: Email.create(email).value,
      name: fields.name,
      lastName: fields.lastName,
      dateOfBirth: fields.dateOfBirth ?? null,
      phone: fields.phone ?? null,
      address: fields.address ?? null,
      addressLine2: fields.addressLine2 ?? null,
      countryCode: fields.countryCode ?? null,
      region: fields.region ?? null,
      city: fields.city ?? null,
      postalCode: fields.postalCode ?? null,
      status: 'active',
      globalRole: 'user',
      emailVerifiedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  static restore(state: UserState): User {
    return new User({ ...state });
  }
  updateProfile(changes: ProfileChanges, now: Date) {
    this.ensureActive();
    if (!Object.keys(changes).length)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Provide at least one profile field.',
      );
    this.state = {
      ...this.state,
      ...validateProfile(changes, now),
      updatedAt: now,
    };
  }
  updateProfileByAdministrator(changes: ProfileChanges, now: Date) {
    this.ensureNotDeleted();
    if (!Object.keys(changes).length)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Provide at least one profile field.',
      );
    this.state = {
      ...this.state,
      ...validateProfile(changes, now),
      updatedAt: now,
    };
  }
  changeEmail(email: string, now: Date) {
    this.ensureActive();
    this.state = {
      ...this.state,
      email: Email.create(email).value,
      emailVerifiedAt: now,
      updatedAt: now,
    };
  }
  anonymize(now: Date) {
    this.ensureNotDeleted();
    this.state = {
      ...this.state,
      email: `deleted.${this.state.id}@anonymized.invalid`,
      name: 'Deleted',
      lastName: 'Account',
      dateOfBirth: null,
      phone: null,
      address: null,
      addressLine2: null,
      countryCode: null,
      region: null,
      city: null,
      postalCode: null,
      globalRole: 'user',
      status: 'deleted',
      emailVerifiedAt: null,
      deletedAt: now,
      updatedAt: now,
    };
  }
  private ensureNotDeleted() {
    if (this.state.status === 'deleted')
      throw new ApplicationError(
        'CONFLICT',
        'A deleted account cannot be modified.',
      );
  }
  changeStatus(status: UserStatus, now: Date) {
    this.ensureNotDeleted();
    if (status !== 'active' && status !== 'disabled')
      throw new ApplicationError('INVALID_INPUT', 'Unsupported user status.');
    this.state = { ...this.state, status, updatedAt: now };
  }
  grantSuperAdmin(now: Date) {
    this.changeGlobalRole('super_admin', now);
  }
  changeGlobalRole(role: GlobalRole, now: Date) {
    this.ensureActive();
    if (!this.state.emailVerifiedAt)
      throw new ApplicationError(
        'CONFLICT',
        'Verify the email before assigning a role.',
      );
    if (!GLOBAL_ROLES.includes(role))
      throw new ApplicationError('INVALID_INPUT', 'Unsupported global role.');
    this.state = { ...this.state, globalRole: role, updatedAt: now };
  }
  verifyEmail(now: Date) {
    this.ensureActive();
    this.state = {
      ...this.state,
      emailVerifiedAt: this.state.emailVerifiedAt || now,
      updatedAt: now,
    };
  }
  ensureActive() {
    if (this.state.status !== 'active')
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'The account is unavailable.',
      );
  }
  snapshot(): UserState {
    return { ...this.state };
  }
}
