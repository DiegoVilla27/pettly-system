import type { EncodedImage, MediaResult } from '../../results/media';
export interface MediaRepository {
  store(metadata: MediaResult, bytes: Uint8Array): Promise<void>;
  find(
    id: string,
  ): Promise<(MediaResult & { bytes: Uint8Array | null }) | null>;
  remove(id: string, now: Date): Promise<void>;
}
export interface ImageProcessor {
  encode(bytes: Uint8Array, mime: string): Promise<EncodedImage>;
}
export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY'),
  IMAGE_PROCESSOR = Symbol('IMAGE_PROCESSOR');
