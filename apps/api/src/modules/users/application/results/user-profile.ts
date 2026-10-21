import type { UserState } from '../../domain/aggregates/user';
export type UserProfile = UserState;
export type {
  NewProfile,
  ProfileChanges,
} from '../../domain/value-objects/profile-details';
