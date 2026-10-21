export class CreatePaymentCommand {
  constructor(
    readonly actorId: string,
    readonly orderId: string,
    readonly idempotencyKey: string,
    readonly requestId: string,
  ) {}
}
export class ReconcilePaymentCommand {
  constructor(
    readonly actorId: string,
    readonly paymentId: string,
    readonly requestId: string,
  ) {}
}
