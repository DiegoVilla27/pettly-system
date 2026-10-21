import { ApplicationError } from '../../../../shared/domain/application-error';
export interface EncodedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}
export interface MediaAssetState {
  id: string;
  uploadedBy: string;
  resourceId: string;
  contentType: 'image/jpeg';
  byteLength: number;
  width: number;
  height: number;
  createdAt: Date;
  deletedAt: Date | null;
}
export class MediaAsset {
  static create(
    id: string,
    uploadedBy: string,
    resourceId: string,
    image: EncodedImage,
    now: Date,
  ): MediaAssetState {
    if (
      image.bytes.length < 1 ||
      image.bytes.length > 2 * 1024 * 1024 ||
      image.width < 1 ||
      image.height < 1 ||
      image.width > 1600 ||
      image.height > 1600
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Image exceeds the encoded size or resolution limits.',
      );
    return {
      id,
      uploadedBy,
      resourceId,
      contentType: 'image/jpeg',
      byteLength: image.bytes.length,
      width: image.width,
      height: image.height,
      createdAt: now,
      deletedAt: null,
    };
  }
}
