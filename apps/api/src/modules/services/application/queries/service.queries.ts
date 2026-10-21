export class ServicesQuery {
  constructor(
    readonly page = 1,
    readonly limit = 20,
    readonly organizationId?: string,
    readonly search?: string,
    readonly category?: string,
    readonly kind?: string,
    readonly status?: string,
    readonly actorId?: string,
    readonly moderation = false,
  ) {}
}
export class AvailabilityQuery {
  constructor(
    readonly serviceId: string,
    readonly resourceId: string,
    readonly from: string,
    readonly to: string,
    readonly nights = 1,
  ) {}
}
