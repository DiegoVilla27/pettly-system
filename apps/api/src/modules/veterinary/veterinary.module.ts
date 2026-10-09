import { ServicesReadModule } from '../services/services-read.module';
import {
  SERVICE_RESOURCE_DIRECTORY,
  type ServiceResourceDirectory,
} from '../services/application/ports/in/service-resource-directory';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { MediaModule } from '../media/media.module';
import {
  USERS_DIRECTORY,
  type UsersDirectory,
} from '../users/application/ports/out/users-directory';
import {
  ORGANIZATION_ACCESS,
  type OrganizationAccess,
} from '../organizations/application/ports/in/organization-access';
import { MEDIA, type Media } from '../media/application/ports/in/media';
import {
  CLOCK,
  ENTROPY,
  type Clock,
  type Entropy,
} from '../../shared/application/runtime-ports';
import {
  CREDENTIALS_REPOSITORY,
  type CredentialsRepository,
} from './application/ports/out/credentials-repository';
import { VETERINARY_USE_CASES } from './application/ports/in/veterinary-use-cases';
import { VETERINARY_ELIGIBILITY } from './application/ports/in/veterinary-eligibility';
import { VeterinaryHandlers } from './application/handlers/veterinary.handlers';
import { PrismaCredentialsRepository } from './adapters/out/persistence/prisma-credentials-repository';
import { VeterinaryController } from './adapters/in/http/controllers/veterinary.controller';
@Module({
  imports: [UsersModule, OrganizationsModule, MediaModule, ServicesReadModule],
  controllers: [VeterinaryController],
  providers: [
    { provide: CREDENTIALS_REPOSITORY, useClass: PrismaCredentialsRepository },
    {
      provide: VETERINARY_USE_CASES,
      useFactory: (
        repo: CredentialsRepository,
        users: UsersDirectory,
        orgs: OrganizationAccess,
        media: Media,
        clock: Clock,
        entropy: Entropy,
        schedules: ServiceResourceDirectory,
      ) =>
        new VeterinaryHandlers(
          repo,
          users,
          orgs,
          media,
          clock,
          entropy,
          schedules,
        ),
      inject: [
        CREDENTIALS_REPOSITORY,
        USERS_DIRECTORY,
        ORGANIZATION_ACCESS,
        MEDIA,
        CLOCK,
        ENTROPY,
        SERVICE_RESOURCE_DIRECTORY,
      ],
    },
    { provide: VETERINARY_ELIGIBILITY, useExisting: VETERINARY_USE_CASES },
  ],
  exports: [VETERINARY_ELIGIBILITY],
})
export class VeterinaryModule {}
