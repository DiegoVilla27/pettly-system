export class BookingsQuery {
  constructor(
    readonly actorId: string,
    readonly page = 1,
    readonly limit = 20,
    readonly organizationId?: string,
    readonly status?: string,
    readonly serviceId?: string,
  ) {}
}
