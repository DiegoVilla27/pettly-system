import type {
  PublicationResult,
  AdoptionRequestResult,
} from '../../../../application/results/adoption';
import type { PublicPublication } from '../../../../application/ports/in/adoptions-use-cases';
export class AdoptionHttpMapper {
  static public(state: PublicPublication) {
    return {
      id: state.id,
      version: state.version,
      animalId: state.animalId,
      organizationId: state.organizationId,
      title: state.title,
      description: state.description,
      conditions: state.conditions,
      countryCode: state.countryCode,
      city: state.city,
      publishedAt: state.publishedAt?.toISOString() ?? null,
      snapshot: state.snapshot
        ? {
            ...state.snapshot,
            photos: state.snapshot.photos.map((p) => ({
              ...p,
              createdAt: p.createdAt.toISOString(),
            })),
          }
        : null,
    };
  }
  static publication(state: PublicationResult) {
    return {
      ...AdoptionHttpMapper.public(state),
      status: state.status,
      version: state.version,
      createdBy: state.createdBy,
      reviewedBy: state.reviewedBy,
      reviewReason: state.reviewReason,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      reviewedAt: state.reviewedAt?.toISOString() ?? null,
      submittedAt: state.submittedAt?.toISOString() ?? null,
      closedAt: state.closedAt?.toISOString() ?? null,
      deletedAt: state.deletedAt?.toISOString() ?? null,
    };
  }
  static request(state: AdoptionRequestResult) {
    return {
      ...state,
      consentedAt: state.consentedAt.toISOString(),
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      reviewedAt: state.reviewedAt?.toISOString() ?? null,
      completedAt: state.completedAt?.toISOString() ?? null,
    };
  }
}
