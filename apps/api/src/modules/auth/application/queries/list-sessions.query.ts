export class ListSessionsQuery {
  constructor(
    readonly userId: string,
    readonly currentSessionId: string,
    readonly page = 1,
    readonly limit = 20,
  ) {}
}
