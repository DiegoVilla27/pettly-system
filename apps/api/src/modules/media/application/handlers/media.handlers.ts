import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import { ApplicationError } from '../../../../shared/domain/application-error';
import { MediaAsset } from '../../domain/aggregates/media-asset';
import type { Media } from '../ports/in/media';
import type {
  MediaRepository,
  ImageProcessor,
} from '../ports/out/media-repository';
import type { EncodedImage } from '../results/media';
export class MediaHandlers implements Media {
  constructor(
    private readonly repository: MediaRepository,
    private readonly processor: ImageProcessor,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
  ) {}
  prepare(bytes: Uint8Array, mime: string) {
    return this.processor.encode(bytes, mime);
  }
  async store(actorId: string, resourceId: string, image: EncodedImage) {
    const asset = MediaAsset.create(
      this.entropy.id(),
      actorId,
      resourceId,
      image,
      this.clock.now(),
    );
    await this.repository.store(asset, image.bytes);
    return asset;
  }
  async read(id: string, resourceId: string) {
    const asset = await this.repository.find(id);
    if (
      !asset ||
      asset.deletedAt ||
      asset.resourceId !== resourceId ||
      !asset.bytes
    )
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Photo was not found.');
    return { bytes: asset.bytes, width: asset.width, height: asset.height };
  }
  async remove(id: string, resourceId: string, now: Date) {
    const asset = await this.repository.find(id);
    if (!asset || asset.resourceId !== resourceId)
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Photo was not found.');
    await this.repository.remove(id, now);
  }
}
