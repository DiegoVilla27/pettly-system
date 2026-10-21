export interface Clock {
  now(): Date;
}
export interface Entropy {
  id(): string;
  token(): string;
  digest(value: string): string;
}
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}
export interface AccessTokens {
  issue(userId: string, sessionId: string): string;
  verify(token: string): { userId: string; sessionId: string };
}
export const CLOCK = Symbol('CLOCK');
export const ENTROPY = Symbol('ENTROPY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const ACCESS_TOKENS = Symbol('ACCESS_TOKENS');
