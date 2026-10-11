export class CredentialsQuery {
  constructor(
    readonly actorId: string,
    readonly page = 1,
    readonly limit = 20,
    readonly organizationId?: string,
    readonly status?: string,
    readonly professionalId?: string,
    readonly verifiedAfter?: Date,
  ) {}
}
export class CredentialQuery {
  constructor(
    readonly actorId: string,
    readonly id: string,
  ) {}
}

export class EligibleCredentialsQuery {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly page = 1,
    readonly limit = 20,
  ) {}
}
