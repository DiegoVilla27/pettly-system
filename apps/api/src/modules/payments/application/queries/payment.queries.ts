export class PaymentQuery {
  constructor(
    readonly actorId: string,
    readonly paymentId: string,
  ) {}
}
export class PaymentsQuery {
  constructor(
    readonly actorId: string,
    readonly page: number,
    readonly limit: number,
    readonly organizationId?: string,
    readonly platform = false,
    readonly status?: string,
  ) {}
}
