export class StockCommand {
  constructor(
    readonly actorId: string,
    readonly variantId: string,
    readonly kind: 'receipt' | 'issue' | 'adjustment',
    readonly quantity: number,
    readonly expectedVersion: number,
    readonly idempotencyKey: string,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
export class HoldCommand {
  constructor(
    readonly actorId: string,
    readonly variantId: string,
    readonly quantity: number,
    readonly expiresAt: Date,
    readonly referenceId: string,
    readonly expectedVersion: number,
    readonly idempotencyKey: string,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
export class HoldDecisionCommand {
  constructor(
    readonly actorId: string,
    readonly holdId: string,
    readonly kind: 'release' | 'consume',
    readonly expectedVersion: number,
    readonly idempotencyKey: string,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
