import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Database } from '../../../../../../shared/infrastructure/database';
import {
  CONFIG,
  type RuntimeConfig,
} from '../../../../../../shared/infrastructure/config';
import { MailCipher } from '../../../../../../shared/infrastructure/mail-cipher';
import {
  USERS_DIRECTORY,
  type UsersDirectory,
} from '../../../../../users/application/ports/out/users-directory';
import type {
  AuthUnitOfWork,
  AuthWork,
} from '../../../../application/ports/out/auth-persistence';
import { PrismaAuthRepository } from './prisma-auth.repository';
@Injectable()
export class PrismaAuthUnitOfWork implements AuthUnitOfWork {
  private readonly cipher: MailCipher;
  constructor(
    private readonly db: Database,
    private readonly auth: PrismaAuthRepository,
    @Inject(USERS_DIRECTORY) private readonly users: UsersDirectory,
    @Inject(CONFIG) settings: RuntimeConfig,
  ) {
    this.cipher = new MailCipher(settings.mailKey);
  }
  run<T>(work: (context: AuthWork) => Promise<T>): Promise<T> {
    return this.db.transaction(() =>
      work({
        users: this.users,
        auth: this.auth,
        lock: (key) => this.db.lock(key),
        cancelEmail: async (to, purpose, userId) => {
          const correlationKey = createHash('sha256')
            .update(`${userId}:${to}:${purpose}`)
            .digest('hex');
          await this.db.client.outboxMessage.updateMany({
            where: {
              correlationKey: {
                in: [
                  correlationKey,
                  createHash('sha256').update(`${to}:${purpose}`).digest('hex'),
                ],
              },
              deliveredAt: null,
              failedAt: null,
            },
            data: { failedAt: new Date(), encryptedPayload: null },
          });
        },
        enqueueEmail: async (email) => {
          const correlationKey = createHash('sha256')
            .update(`${email.userId}:${email.to}:${email.purpose}`)
            .digest('hex');
          await this.db.client.outboxMessage.updateMany({
            where: { correlationKey, deliveredAt: null, failedAt: null },
            data: { failedAt: new Date(), encryptedPayload: null },
          });
          await this.db.client.outboxMessage.create({
            data: {
              id: email.id,
              correlationKey,
              expiresAt: email.expiresAt,
              encryptedPayload: this.cipher.encrypt(email),
            },
          });
        },
      }),
    );
  }
}
