import { ApplicationError } from '../../../../shared/domain/application-error';
export class OrdersQuery {
  constructor(
    readonly actorId: string,
    readonly page = 1,
    readonly limit = 20,
    readonly organizationId?: string,
    readonly status?: string,
    readonly search?: string,
  ) {
    if (
      (search !== undefined &&
        (search.trim() !== search ||
          search.length < 2 ||
          search.length > 100 ||
          /\p{Cc}/u.test(search))) ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Invalid order filters or pagination.',
      );
  }
}
