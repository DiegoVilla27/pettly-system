import type { EncodedImage, MediaResult } from '../../results/media';
export interface Media {
  prepare(bytes: Uint8Array, mime: string): Promise<EncodedImage>;
  store(
    actorId: string,
    resourceId: string,
    image: EncodedImage,
  ): Promise<MediaResult>;
  read(id: string, resourceId: string): Promise<EncodedImage>;
  remove(id: string, resourceId: string, now: Date): Promise<void>;
}
export const MEDIA = Symbol('MEDIA');
