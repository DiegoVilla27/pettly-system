import type {
  UserProfile,
  NewProfile,
  ProfileChanges,
} from '../../results/user-profile';
export interface UsersDirectory {
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  create(
    id: string,
    email: string,
    profile: NewProfile,
    now: Date,
  ): Promise<UserProfile>;
  countActiveSuperAdmins(): Promise<number>;
  changeEmail(id: string, email: string, now: Date): Promise<void>;
  anonymize(id: string, now: Date): Promise<void>;
  audit(entry: import('./users-administration').UserAuditEntry): Promise<void>;
  verifyEmail(id: string, now: Date): Promise<void>;
  updateProfile(
    id: string,
    changes: ProfileChanges,
    now: Date,
  ): Promise<UserProfile>;
}
export const USERS_DIRECTORY = Symbol('USERS_DIRECTORY');
