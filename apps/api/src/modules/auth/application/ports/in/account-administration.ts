import type {
  NewProfile,
  UserProfile,
} from '../../../../users/application/results/user-profile';
export interface InviteAccountCommand {
  actorId: string;
  email: string;
  profile: NewProfile;
  reason: string;
  requestId: string;
}
export interface DeleteAccountCommand {
  actorId: string;
  userId: string;
  reason: string;
  requestId: string;
  administrative: boolean;
  password?: string;
}
export interface ResendInvitationCommand {
  actorId: string;
  userId: string;
  reason: string;
  requestId: string;
}
export interface AccountAdministration {
  invite(command: InviteAccountCommand): Promise<UserProfile>;
  resendInvitation(command: ResendInvitationCommand): Promise<void>;
  remove(command: DeleteAccountCommand): Promise<void>;
}
export const ACCOUNT_ADMINISTRATION = Symbol('ACCOUNT_ADMINISTRATION');
