import type {
  Organization,
  OrganizationMembership as PrismaMembership,
} from '@prisma/client';
import type {
  OrganizationResult,
  MembershipResult,
} from '../../../../application/results/organization';
import type {
  OrganizationType,
  MembershipRole,
} from '../../../../../../shared/domain/authorization';
export class OrganizationPersistenceMapper {
  static organization(row: Organization): OrganizationResult {
    return {
      ...row,
      type: row.type as OrganizationType,
      status:
        row.status as import('../../../../../../shared/domain/organization-state').OrganizationStatus,
    };
  }
  static membership(row: PrismaMembership): MembershipResult {
    return {
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      role: row.role as MembershipRole,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
