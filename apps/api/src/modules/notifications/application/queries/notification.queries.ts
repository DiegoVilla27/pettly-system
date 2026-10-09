export class NotificationsQuery {
  constructor(
    readonly actorId: string,
    readonly page = 1,
    readonly limit = 20,
    readonly unreadOnly = false,
    readonly category?: string,
  ) {}
}
export class FailedDeliveriesQuery {
  constructor(
    readonly actorId: string,
    readonly page = 1,
    readonly limit = 20,
  ) {}
}
