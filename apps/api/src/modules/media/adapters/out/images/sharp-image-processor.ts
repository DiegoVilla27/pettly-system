import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ApplicationError } from '../../../../../shared/domain/application-error';
import type { ImageProcessor } from '../../../application/ports/out/media-repository';
@Injectable()
export class SharpImageProcessor implements ImageProcessor {
  async encode(bytes: Uint8Array, mime: string) {
    if (!bytes.length || bytes.length > 5 * 1024 * 1024)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Upload must contain 1 byte to 5 MiB.',
      );
    try {
      const image = sharp(Buffer.from(bytes), {
        limitInputPixels: 20000000,
        failOn: 'warning',
        animated: true,
      });
      const metadata = await image.metadata();
      const types: Record<string, string> = {
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      };
      if (
        !metadata.format ||
        types[metadata.format] !== mime ||
        (metadata.pages ?? 1) !== 1 ||
        !metadata.width ||
        !metadata.height ||
        metadata.width * metadata.height > 20000000
      )
        throw Error();
      const { data, info } = await image
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      if (data.length > 2 * 1024 * 1024) throw Error();
      return { bytes: data, width: info.width, height: info.height };
    } catch {
      throw new ApplicationError(
        'INVALID_INPUT',
        'A valid single-frame JPEG, PNG or WebP image within the pixel and size limits is required.',
      );
    }
  }
}
