import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { MediaModule } from '../media/media.module';
import {
  AUTHORIZATION,
  type Authorization,
} from '../authorization/application/ports/in/authorization';
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
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from './application/ports/out/catalog-repository';
import { CATALOG_USE_CASES } from './application/ports/in/catalog-use-cases';
import { CATALOG_ACCESS } from './application/ports/in/catalog-access';
import { CatalogHandlers } from './application/handlers/catalog.handlers';
import { PrismaCatalogRepository } from './adapters/out/persistence/prisma-catalog-repository';
import {
  CatalogController,
  PublicCatalogController,
} from './adapters/in/http/controllers/catalog.controller';
@Module({
  imports: [AuthorizationModule, OrganizationsModule, MediaModule],
  controllers: [PublicCatalogController, CatalogController],
  providers: [
    { provide: CATALOG_REPOSITORY, useClass: PrismaCatalogRepository },
    {
      provide: CATALOG_USE_CASES,
      useFactory: (
        repo: CatalogRepository,
        auth: Authorization,
        orgs: OrganizationAccess,
        media: Media,
        clock: Clock,
        entropy: Entropy,
      ) => new CatalogHandlers(repo, auth, orgs, media, clock, entropy),
      inject: [
        CATALOG_REPOSITORY,
        AUTHORIZATION,
        ORGANIZATION_ACCESS,
        MEDIA,
        CLOCK,
        ENTROPY,
      ],
    },
    { provide: CATALOG_ACCESS, useExisting: CATALOG_USE_CASES },
  ],
  exports: [CATALOG_ACCESS],
})
export class CatalogModule {}
