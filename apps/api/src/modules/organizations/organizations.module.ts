import { NotificationsModule } from '../notifications/notifications.module';
import {
  BUSINESS_NOTIFICATIONS,
  type BusinessNotifications,
} from '../notifications/application/ports/in/business-notifications';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import {
  USERS_DIRECTORY,
  type UsersDirectory,
} from '../users/application/ports/out/users-directory';
import {
  CLOCK,
  ENTROPY,
  type Clock,
  type Entropy,
} from '../../shared/application/runtime-ports';
import {
  ORGANIZATIONS_REPOSITORY,
  type OrganizationsRepository,
} from './application/ports/out/organizations-repository';
import { ORGANIZATIONS_USE_CASES } from './application/ports/in/organizations-use-cases';
import { ORGANIZATION_ACCESS } from './application/ports/in/organization-access';
import { OrganizationLifecycleHandlers } from './application/handlers/organization-lifecycle.handlers';
import { OrganizationsHandlers } from './application/handlers/organizations.handlers';
import { PrismaOrganizationsRepository } from './adapters/out/persistence/prisma/prisma-organizations-repository';
import { OrganizationsController } from './adapters/in/http/controllers/organizations.controller';
@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [OrganizationsController],
  providers: [
    {
      provide: ORGANIZATIONS_REPOSITORY,
      useClass: PrismaOrganizationsRepository,
    },
    { provide: ORGANIZATION_ACCESS, useExisting: ORGANIZATIONS_REPOSITORY },
    {
      provide: ORGANIZATIONS_USE_CASES,
      useFactory: (
        repository: OrganizationsRepository,
        users: UsersDirectory,
        clock: Clock,
        entropy: Entropy,
        notices: BusinessNotifications,
      ) => {
        const base = new OrganizationsHandlers(
            repository,
            users,
            clock,
            entropy,
            notices,
          ),
          lifecycle = new OrganizationLifecycleHandlers(
            repository,
            users,
            clock,
            entropy,
            notices,
          );
        return {
          create: (c) => base.create(c),
          get: (q) => base.get(q),
          assign: (c) => base.assign(c),
          remove: (c) => base.remove(c),
          request: (c) => lifecycle.request(c),
          list: (q) => lifecycle.list(q),
          profile: (q) => lifecycle.profile(q),
          updateProfile: (c) => lifecycle.updateProfile(c),
          submit: (c) => lifecycle.submit(c),
          approve: (c) => lifecycle.approve(c),
          reject: (c) => lifecycle.reject(c),
          status: (c) => lifecycle.status(c),
          responsible: (c) => lifecycle.responsible(c),
          archive: (c) => lifecycle.archive(c),
          members: (q) => lifecycle.members(q),
          audits: (q) => lifecycle.audits(q),
        } satisfies import('./application/ports/in/organizations-use-cases').OrganizationsUseCases;
      },
      inject: [
        ORGANIZATIONS_REPOSITORY,
        USERS_DIRECTORY,
        CLOCK,
        ENTROPY,
        BUSINESS_NOTIFICATIONS,
      ],
    },
  ],
  exports: [ORGANIZATION_ACCESS],
})
export class OrganizationsModule {}
