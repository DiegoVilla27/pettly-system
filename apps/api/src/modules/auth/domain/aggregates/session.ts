import { ApplicationError } from '../../../../shared/domain/application-error';
export interface SessionState {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}
export class Session {
  constructor(private state: SessionState) {}
  static create(
    id: string,
    userId: string,
    now: Date,
    durationSeconds: number,
  ) {
    return new Session({
      id,
      userId,
      createdAt: now,
      revokedAt: null,
      expiresAt: new Date(now.getTime() + durationSeconds * 1000),
    });
  }
  ensureActive(now: Date) {
    if (this.state.revokedAt || this.state.expiresAt <= now)
      throw new ApplicationError(
        'INVALID_TOKEN',
        'The session has expired or has been revoked.',
      );
  }
  revoke(now: Date) {
    this.state = { ...this.state, revokedAt: this.state.revokedAt || now };
  }
  snapshot(): SessionState {
    return { ...this.state };
  }
}
