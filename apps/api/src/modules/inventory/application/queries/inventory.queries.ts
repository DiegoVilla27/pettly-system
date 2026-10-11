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

export class InventoryListQuery {
  constructor(
    readonly actorId: string,
    readonly organizationId: string,
    readonly page = 1,
    readonly limit = 20,
    readonly search?: string,
    readonly status?: 'active' | 'archived',
    readonly variantId?: string,
  ) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      (search !== undefined &&
        (search.length > 100 || /\p{Cc}/u.test(search))) ||
      (status !== undefined && !['active', 'archived'].includes(status))
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Invalid inventory directory query.',
      );
  }
}
