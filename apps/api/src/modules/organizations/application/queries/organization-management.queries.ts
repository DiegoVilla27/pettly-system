import type { OrganizationType } from '../../../../shared/domain/authorization';
import type { OrganizationStatus } from '../../../../shared/domain/organization-state';
export class ListOrganizationsQuery {
  constructor(
    readonly actorId: string,
    readonly page = 1,
    readonly limit = 20,
    readonly search?: string,
    readonly status?: OrganizationStatus,
    readonly type?: OrganizationType,
    readonly countryCode?: string,
    readonly mine = false,
  ) {}
}
export class OrganizationPageQuery {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly page = 1,
    readonly limit = 20,
  ) {}
}
