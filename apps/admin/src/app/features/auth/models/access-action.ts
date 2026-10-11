export type AccessAction =
  'forgot' | 'reset' | 'verify' | 'resend' | 'invitation' | 'confirm-email';
export interface AccessRequest {
  action: AccessAction;
  email: string;
  password: string;
  token: string;
}
