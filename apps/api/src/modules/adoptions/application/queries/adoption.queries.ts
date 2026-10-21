export class PublicPublicationsQuery {
  constructor(
    readonly limit = 20,
    readonly cursor?: string,
    readonly search?: string,
    readonly species?: string,
    readonly countryCode?: string,
    readonly city?: string,
  ) {}
}
export class OrganizationPublicationsQuery {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly page = 1,
    readonly limit = 20,
    readonly status?: string,
  ) {}
}
export class AdoptionRequestsQuery {
  constructor(
    readonly actorId: string,
    readonly publicationId: string | null = null,
    readonly page = 1,
    readonly limit = 20,
    readonly status?: string,
  ) {}
}
