import { Module } from '@nestjs/common';
import {
  CLOCK,
  ENTROPY,
  type Clock,
  type Entropy,
} from '../../shared/application/runtime-ports';
import { MEDIA } from './application/ports/in/media';
import {
  MEDIA_REPOSITORY,
  IMAGE_PROCESSOR,
  type MediaRepository,
  type ImageProcessor,
} from './application/ports/out/media-repository';
import { MediaHandlers } from './application/handlers/media.handlers';
import { PrismaMediaRepository } from './adapters/out/persistence/prisma-media-repository';
import { SharpImageProcessor } from './adapters/out/images/sharp-image-processor';
@Module({
  providers: [
    { provide: MEDIA_REPOSITORY, useClass: PrismaMediaRepository },
    { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessor },
    {
      provide: MEDIA,
      useFactory: (
        repo: MediaRepository,
        processor: ImageProcessor,
        clock: Clock,
        entropy: Entropy,
      ) => new MediaHandlers(repo, processor, clock, entropy),
      inject: [MEDIA_REPOSITORY, IMAGE_PROCESSOR, CLOCK, ENTROPY],
    },
  ],
  exports: [MEDIA],
})
export class MediaModule {}
