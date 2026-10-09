import { ApplicationError } from '../../../../shared/domain/application-error';
export class StockQuery {
  constructor(
    readonly actorId: string,
    readonly variantId: string,
    readonly page = 1,
    readonly limit = 20,
  ) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Invalid inventory pagination.',
      );
  }
}
