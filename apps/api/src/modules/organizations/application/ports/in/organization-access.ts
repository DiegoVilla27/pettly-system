import type { OrganizationMembership } from '../../results/organization';
export interface OrganizationAccess {
  states(ids: string[]): Promise<
    {
      id: string;
      status: import('../../../../../shared/domain/organization-state').OrganizationStatus;
      type: import('../../../../../shared/domain/authorization').OrganizationType;
    }[]
  >;
  findOrganization(
    id: string,
  ): Promise<import('../../results/organization').OrganizationResult | null>;
  membershipsForUser(userId: string): Promise<OrganizationMembership[]>;
}
export const ORGANIZATION_ACCESS = Symbol('ORGANIZATION_ACCESS');
