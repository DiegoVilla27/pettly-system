import { Injectable } from '@nestjs/common';
import { Database } from '../../../../../../shared/infrastructure/database';
import type {
  ActionTokenState,
  AuthRepository,
  TokenPurpose,
} from '../../../../application/ports/out/auth-persistence';
import type { SessionState } from '../../../../domain/aggregates/session';
import { SessionPersistenceMapper } from './session.mapper';
@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: Database) {}
  async pendingEmail(userId: string) {
    return (
      (await this.db.client.credential.findUnique({ where: { userId } }))
        ?.pendingEmail ?? null
    );
  }
  async setPendingEmail(userId: string, pendingEmail: string | null) {
    await this.db.client.credential.update({
      where: { userId },
      data: { pendingEmail },
    });
  }
  async invalidateAllActionTokens(userId: string, now: Date) {
    await this.db.client.actionToken.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: now },
    });
  }
  async eraseAuthentication(userId: string, now: Date) {
    await this.revokeAll(userId, now);
    await this.db.client.refreshToken.deleteMany({
      where: { session: { userId } },
    });
    await this.db.client.actionToken.deleteMany({ where: { userId } });
    await this.db.client.credential.deleteMany({ where: { userId } });
  }
  async sessions(userId: string, now: Date, page: number, limit: number) {
    const where = { userId, revokedAt: null, expiresAt: { gt: now } };
    const [rows, total] = await Promise.all([
      this.db.client.session.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.db.client.session.count({ where }),
    ]);
    return {
      items: rows.map((row) =>
        SessionPersistenceMapper.toDomain(row).snapshot(),
      ),
      total,
    };
  }
  async passwordHash(userId: string) {
    return (
      (await this.db.client.credential.findUnique({ where: { userId } }))
        ?.passwordHash || null
    );
  }
  async savePassword(userId: string, passwordHash: string) {
    await this.db.client.credential.upsert({
      where: { userId },
      create: { userId, passwordHash },
      update: { passwordHash },
    });
  }
  async session(id: string) {
    const row = await this.db.client.session.findUnique({ where: { id } });
    return row ? SessionPersistenceMapper.toDomain(row).snapshot() : null;
  }
  async addSession(state: SessionState, tokenHash: string) {
    await this.db.client.session.create({
      data: { ...state, tokens: { create: { hash: tokenHash } } },
    });
  }
  async refreshToken(hash: string) {
    const row = await this.db.client.refreshToken.findUnique({
      where: { hash },
      include: { session: true },
    });
    return row
      ? {
          session: SessionPersistenceMapper.toDomain(row.session).snapshot(),
          consumedAt: row.consumedAt,
        }
      : null;
  }
  async rotateRefresh(
    oldHash: string,
    newHash: string,
    sessionId: string,
    now: Date,
  ) {
    await this.db.client.refreshToken.update({
      where: { hash: oldHash },
      data: { consumedAt: now },
    });
    await this.db.client.refreshToken.create({
      data: { hash: newHash, sessionId },
    });
  }
  async revokeSession(id: string, now: Date) {
    await this.db.client.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: now },
    });
  }
  async revokeAll(userId: string, now: Date) {
    await this.db.client.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
  actionToken(hash: string) {
    return this.db.client.actionToken.findUnique({ where: { hash } });
  }
  async replaceActionToken(state: ActionTokenState) {
    await this.invalidateActionTokens(
      state.userId,
      state.purpose as TokenPurpose,
      new Date(),
    );
    await this.db.client.actionToken.create({ data: state });
  }
  async consumeActionToken(hash: string, now: Date) {
    await this.db.client.actionToken.update({
      where: { hash },
      data: { consumedAt: now },
    });
  }
  async invalidateActionTokens(
    userId: string,
    purpose: TokenPurpose,
    now: Date,
  ) {
    await this.db.client.actionToken.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: now },
    });
  }
}
