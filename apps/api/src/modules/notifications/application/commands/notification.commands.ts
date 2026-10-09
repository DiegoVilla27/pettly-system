export class ReadNotificationCommand {
  constructor(
    readonly actorId: string,
    readonly id: string,
  ) {}
}
export class ReadAllNotificationsCommand {
  constructor(
    readonly actorId: string,
    readonly through: Date,
  ) {}
}
export class ChangeNotificationPreferencesCommand {
  constructor(
    readonly actorId: string,
    readonly expectedVersion: number,
    readonly preferences: {
      ordersEmail: boolean;
      adoptionsEmail: boolean;
      bookingsEmail: boolean;
    },
  ) {}
}
export class RetryNotificationCommand {
  constructor(
    readonly actorId: string,
    readonly id: string,
    readonly reason: string,
  ) {}
}
