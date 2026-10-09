import {
  USERS_ADMINISTRATION,
  type UsersAdministration,
} from './application/ports/out/users-administration';
import { PrismaUsersAdministration } from './adapters/out/persistence/prisma/prisma-users-administration';
import { ChangeUserStatusHandler } from './application/handlers/change-user-status.handler';
import { ChangeUserRoleHandler } from './application/handlers/change-user-role.handler';
import { BootstrapSuperAdminHandler } from './application/handlers/bootstrap-super-admin.handler';
import { AdminUsersHandlers } from './application/handlers/admin-users.handlers';
import { Module } from '@nestjs/common';
import {
  CLOCK,
  ENTROPY,
  type Clock,
  type Entropy,
} from '../../shared/application/runtime-ports';
import {
  USERS_DIRECTORY,
  type UsersDirectory,
} from './application/ports/out/users-directory';
import {
  USERS_USE_CASES,
  type UsersUseCases,
} from './application/ports/in/users-use-cases';
import {
  GetProfileHandler,
  UpdateProfileHandler,
} from './application/handlers/profile.handlers';
import { PrismaUsersDirectory } from './adapters/out/persistence/prisma/prisma-users-directory';
import { UsersController } from './adapters/in/http/controllers/users.controller';
@Module({
  controllers: [UsersController],
  providers: [
    { provide: USERS_ADMINISTRATION, useClass: PrismaUsersAdministration },
    { provide: USERS_DIRECTORY, useClass: PrismaUsersDirectory },
    {
      provide: USERS_USE_CASES,
      useFactory: (
        users: UsersDirectory,
        clock: Clock,
        administration: UsersAdministration,
        entropy: Entropy,
      ): UsersUseCases => {
        const get = new GetProfileHandler(users),
          update = new UpdateProfileHandler(users, clock);
        const admin = new AdminUsersHandlers(administration, clock, entropy);
        return {
          listAudit: (q) => admin.audit(q),
          list: (q) => admin.list(q),
          getUser: (q) => admin.get(q),
          adminUpdateProfile: (c) => admin.update(c),
          changeRole: (c) =>
            new ChangeUserRoleHandler(administration, clock, entropy).execute(
              c,
            ),
          changeStatus: (c) =>
            new ChangeUserStatusHandler(administration, clock, entropy).execute(
              c,
            ),
          bootstrapSuperAdmin: (c) =>
            new BootstrapSuperAdminHandler(
              administration,
              clock,
              entropy,
            ).execute(c),
          getProfile: (q) => get.execute(q),
          updateProfile: (c) => update.execute(c),
        };
      },
      inject: [USERS_DIRECTORY, CLOCK, USERS_ADMINISTRATION, ENTROPY],
    },
  ],
  exports: [USERS_DIRECTORY, USERS_USE_CASES],
})
export class UsersModule {}
