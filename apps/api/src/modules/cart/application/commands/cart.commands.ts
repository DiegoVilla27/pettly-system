export class CartCommand {
  constructor(
    readonly actorId: string,
    readonly expectedVersion: number,
  ) {}
}
export class PutCartItemCommand extends CartCommand {
  constructor(
    actorId: string,
    version: number,
    readonly variantId: string,
    readonly quantity: number,
  ) {
    super(actorId, version);
  }
}
export class RemoveCartItemCommand extends CartCommand {
  constructor(
    actorId: string,
    version: number,
    readonly variantId: string,
  ) {
    super(actorId, version);
  }
}
