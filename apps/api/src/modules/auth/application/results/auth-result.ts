export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
  refreshExpiresAt: Date;
}
export interface Principal {
  userId: string;
  sessionId: string;
}
