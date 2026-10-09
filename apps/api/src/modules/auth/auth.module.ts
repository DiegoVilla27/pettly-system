import { Global, Module } from '@nestjs/common';
import { CONFIG, type RuntimeConfig } from '../../shared/infrastructure/config';
import {
  ACCESS_TOKENS,
  CLOCK,
  ENTROPY,
  PASSWORD_HASHER,
  type AccessTokens,
  type Clock,
  type Entropy,
  type PasswordHasher,
} from '../../shared/application/runtime-ports';
import { ACCOUNT_ADMINISTRATION } from './application/ports/in/account-administration';
import { UsersModule } from '../users/users.module';
import {
  AUTH_UNIT_OF_WORK,
  type AuthUnitOfWork,
} from './application/ports/out/auth-persistence';
import { SESSION_REVOCATION } from './application/ports/in/session-revocation';
import { AUTH_USE_CASES } from './application/ports/in/auth-use-cases';
import { createAuthUseCases } from './application/handlers/auth.facade';
import { PrismaAuthRepository } from './adapters/out/persistence/prisma/prisma-auth.repository';
import { PrismaAuthUnitOfWork } from './adapters/out/persistence/prisma/prisma-auth-unit-of-work';
import { AccountSecurityController } from './adapters/in/http/controllers/account-security.controller';
import { AuthController } from './adapters/in/http/controllers/auth.controller';
@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController, AccountSecurityController],
  providers: [
    PrismaAuthRepository,
    { provide: ACCOUNT_ADMINISTRATION, useExisting: AUTH_USE_CASES },
    { provide: SESSION_REVOCATION, useExisting: PrismaAuthRepository },
    { provide: AUTH_UNIT_OF_WORK, useClass: PrismaAuthUnitOfWork },
    {
      provide: AUTH_USE_CASES,
      useFactory: async (
        uow: AuthUnitOfWork,
        clock: Clock,
        entropy: Entropy,
        passwords: PasswordHasher,
        access: AccessTokens,
        policy: RuntimeConfig,
      ) =>
        createAuthUseCases({
          uow,
          clock,
          entropy,
          passwords,
          access,
          policy,
          dummyPasswordHash: await passwords.hash(entropy.token()),
        }),
      inject: [
        AUTH_UNIT_OF_WORK,
        CLOCK,
        ENTROPY,
        PASSWORD_HASHER,
        ACCESS_TOKENS,
        CONFIG,
      ],
    },
  ],
  exports: [AUTH_USE_CASES, SESSION_REVOCATION, ACCOUNT_ADMINISTRATION],
})
export class AuthModule {}
