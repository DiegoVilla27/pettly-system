import { ANIMALS_BOOKING } from './application/ports/in/animals-booking';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { MediaModule } from '../media/media.module';
import {
  USERS_DIRECTORY,
  type UsersDirectory,
} from '../users/application/ports/out/users-directory';
import {
  AUTHORIZATION,
  type Authorization,
} from '../authorization/application/ports/in/authorization';
import { MEDIA, type Media } from '../media/application/ports/in/media';
import {
  CLOCK,
  ENTROPY,
  type Clock,
  type Entropy,
} from '../../shared/application/runtime-ports';
import {
  ANIMALS_REPOSITORY,
  type AnimalsRepository,
} from './application/ports/out/animals-repository';
import { ANIMALS_USE_CASES } from './application/ports/in/animals-use-cases';
import { ANIMALS_CATALOG } from './application/ports/in/animals-catalog';
import { AnimalsHandlers } from './application/handlers/animals.handlers';
import { PrismaAnimalsRepository } from './adapters/out/persistence/prisma/prisma-animals-repository';
import { AnimalsController } from './adapters/in/http/controllers/animals.controller';
@Module({
  imports: [UsersModule, AuthorizationModule, MediaModule],
  controllers: [AnimalsController],
  providers: [
    { provide: ANIMALS_BOOKING, useExisting: ANIMALS_USE_CASES },
    { provide: ANIMALS_REPOSITORY, useClass: PrismaAnimalsRepository },
    {
      provide: ANIMALS_USE_CASES,
      useFactory: (
        repo: AnimalsRepository,
        users: UsersDirectory,
        auth: Authorization,
        media: Media,
        clock: Clock,
        entropy: Entropy,
      ) => new AnimalsHandlers(repo, users, auth, media, clock, entropy),
      inject: [
        ANIMALS_REPOSITORY,
        USERS_DIRECTORY,
        AUTHORIZATION,
        MEDIA,
        CLOCK,
        ENTROPY,
      ],
    },
    { provide: ANIMALS_CATALOG, useExisting: ANIMALS_USE_CASES },
  ],
  exports: [ANIMALS_BOOKING, ANIMALS_CATALOG],
})
export class AnimalsModule {}
