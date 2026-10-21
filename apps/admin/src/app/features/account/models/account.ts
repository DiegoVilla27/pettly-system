import type { ApiRequest, ApiResponse } from '@pettly/api-client';
export type Profile = ApiResponse<'getCurrentUser'>;
export type ProfileChanges = ApiRequest<'updateCurrentUser'>;
export type Sessions = ApiResponse<'listOwnSessions'>;
export type AccountCommand =
  | { kind: 'profile'; body: ProfileChanges }
  | { kind: 'password'; body: ApiRequest<'changePassword'> }
  | { kind: 'email'; body: ApiRequest<'requestEmailChange'> }
  | { kind: 'delete'; body: ApiRequest<'deleteOwnAccount'> }
  | { kind: 'logout-all' }
  | { kind: 'revoke'; sessionId: string; current: boolean };
