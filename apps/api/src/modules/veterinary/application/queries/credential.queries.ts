export class CredentialsQuery {
  constructor(
    readonly actorId: string,
    readonly page = 1,
    readonly limit = 20,
    readonly organizationId?: string,
    readonly status?: string,
  ) {}
}
export class CredentialQuery {
  constructor(
    readonly actorId: string,
    readonly id: string,
  ) {}
}
