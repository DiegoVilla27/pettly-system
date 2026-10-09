import { Injectable } from '@nestjs/common';
import { Database } from '../../../../../shared/infrastructure/database';
import type { MediaRepository } from '../../../application/ports/out/media-repository';
import type { MediaResult } from '../../../application/results/media';
@Injectable()
export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly db: Database) {}
  async store(metadata: MediaResult, bytes: Uint8Array) {
    await this.db.client.mediaAsset.create({
      data: { ...metadata, bytes: Buffer.from(bytes) },
    });
  }
  async find(id: string) {
    const row = await this.db.client.mediaAsset.findUnique({ where: { id } });
    return row ? { ...row, contentType: 'image/jpeg' as const } : null;
  }
  async remove(id: string, now: Date) {
    await this.db.client.mediaAsset.update({
      where: { id },
      data: { bytes: null, deletedAt: now },
    });
  }
}
