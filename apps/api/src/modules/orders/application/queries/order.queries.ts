import { ApplicationError } from '../../../../shared/domain/application-error';
export class OrdersQuery {
  constructor(
    readonly actorId: string,
    readonly page = 1,
    readonly limit = 20,
    readonly organizationId?: string,
    readonly status?: string,
  ) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new ApplicationError('INVALID_INPUT', 'Invalid order pagination.');
  }
}
