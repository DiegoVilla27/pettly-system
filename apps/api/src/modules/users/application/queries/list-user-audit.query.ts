export class ListUserAuditQuery {
  constructor(
    readonly actorId: string,
    readonly userId: string,
    readonly page = 1,
    readonly limit = 20,
  ) {}
}
