export class GetAccessQuery {
  constructor(readonly userId: string) {}
}

export class GetUserAccessQuery {
  constructor(
    readonly actorId: string,
    readonly userId: string,
  ) {}
}
