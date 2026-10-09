import {
  Prisma,
  type AdoptionPublication,
  type AdoptionRequest,
} from '@prisma/client';
import type {
  PublicationResult,
  AdoptionRequestResult,
} from '../../../../application/results/adoption';
export class AdoptionPersistenceMapper {
  static publication(row: AdoptionPublication): PublicationResult {
    const snapshot = row.snapshot as unknown as PublicationResult['snapshot'];
    return {
      ...row,
      status: row.status as PublicationResult['status'],
      snapshot: snapshot
        ? {
            ...snapshot,
            photos: snapshot.photos.map((photo) => ({
              ...photo,
              createdAt: new Date(photo.createdAt),
            })),
          }
        : null,
    };
  }
  static publicationData(state: PublicationResult) {
    return {
      ...state,
      snapshot: state.snapshot
        ? (JSON.parse(JSON.stringify(state.snapshot)) as Prisma.InputJsonValue)
        : Prisma.DbNull,
    };
  }
  static request(row: AdoptionRequest): AdoptionRequestResult {
    return { ...row, status: row.status as AdoptionRequestResult['status'] };
  }
}
