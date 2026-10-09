import { NotificationsModule } from '../notifications/notifications.module';
import {
  BUSINESS_NOTIFICATIONS,
  type BusinessNotifications,
} from '../notifications/application/ports/in/business-notifications';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AnimalsModule } from '../animals/animals.module';
import { MediaModule } from '../media/media.module';
import {
  USERS_DIRECTORY,
  type UsersDirectory,
} from '../users/application/ports/out/users-directory';
import {
  AUTHORIZATION,
  type Authorization,
} from '../authorization/application/ports/in/authorization';
import {
  ORGANIZATION_ACCESS,
  type OrganizationAccess,
} from '../organizations/application/ports/in/organization-access';
import {
  ANIMALS_CATALOG,
  type AnimalsCatalog,
} from '../animals/application/ports/in/animals-catalog';
import { MEDIA, type Media } from '../media/application/ports/in/media';
import {
  CLOCK,
  ENTROPY,
  type Clock,
  type Entropy,
} from '../../shared/application/runtime-ports';
import {
  ADOPTIONS_REPOSITORY,
  type AdoptionsRepository,
} from './application/ports/out/adoptions-repository';
import { ADOPTIONS_USE_CASES } from './application/ports/in/adoptions-use-cases';
import { AdoptionsHandlers } from './application/handlers/adoptions.handlers';
import { PrismaAdoptionsRepository } from './adapters/out/persistence/prisma/prisma-adoptions-repository';
import {
  AdoptionsController,
  PublicAdoptionsController,
} from './adapters/in/http/controllers/adoptions.controller';
@Module({
  imports: [
    NotificationsModule,
    UsersModule,
    AuthorizationModule,
    OrganizationsModule,
    AnimalsModule,
    MediaModule,
  ],
  controllers: [PublicAdoptionsController, AdoptionsController],
  providers: [
    { provide: ADOPTIONS_REPOSITORY, useClass: PrismaAdoptionsRepository },
    {
      provide: ADOPTIONS_USE_CASES,
      useFactory: (
        repo: AdoptionsRepository,
        users: UsersDirectory,
        auth: Authorization,
        organizations: OrganizationAccess,
        animals: AnimalsCatalog,
        media: Media,
        clock: Clock,
        entropy: Entropy,
        notices: BusinessNotifications,
      ) =>
        new AdoptionsHandlers(
          repo,
          users,
          auth,
          organizations,
          animals,
          media,
          clock,
          entropy,
          notices,
        ),
      inject: [
        ADOPTIONS_REPOSITORY,
        USERS_DIRECTORY,
        AUTHORIZATION,
        ORGANIZATION_ACCESS,
        ANIMALS_CATALOG,
        MEDIA,
        CLOCK,
        ENTROPY,
        BUSINESS_NOTIFICATIONS,
      ],
    },
  ],
})
export class AdoptionsModule {}
