import type {
  ServiceState,
  ResourceState,
  BlockState,
} from '../../../../application/results/service';
export class ServicesHttpMapper {
  static service(s: ServiceState, managed = true) {
    const { createdBy, reviewedBy, reviewedAt, reviewReason, ...profile } = s;
    return {
      ...profile,
      veterinaryCredentialId: s.veterinaryCredentialId ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      timeZone: 'America/Bogota' as const,
      ...(managed
        ? {
            createdBy,
            reviewedBy,
            reviewedAt: reviewedAt?.toISOString() ?? null,
            reviewReason,
          }
        : {}),
    };
  }
  static resource(r: ResourceState) {
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      timeZone: 'America/Bogota' as const,
    };
  }
  static block(b: BlockState) {
    return {
      ...b,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      releasedAt: b.releasedAt?.toISOString() ?? null,
    };
  }
}
