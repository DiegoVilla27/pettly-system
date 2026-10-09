export class GetOrganizationQuery {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
  ) {}
}
