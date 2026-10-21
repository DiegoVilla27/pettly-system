import type {
  OrganizationResult,
  MembershipResult,
} from '../../../../application/results/organization';
export class OrganizationHttpMapper {
  static organization(result: OrganizationResult) {
    return {
      id: result.id,
      name: result.name,
      type: result.type,
      status: result.status,
      version: result.version,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }
  static profile(result: OrganizationResult) {
    return {
      ...result,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      submittedAt: result.submittedAt?.toISOString() ?? null,
      reviewedAt: result.reviewedAt?.toISOString() ?? null,
      approvedAt: result.approvedAt?.toISOString() ?? null,
      suspendedAt: result.suspendedAt?.toISOString() ?? null,
      deletedAt: result.deletedAt?.toISOString() ?? null,
    };
  }
  static membership(result: MembershipResult) {
    return {
      ...result,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }
}
