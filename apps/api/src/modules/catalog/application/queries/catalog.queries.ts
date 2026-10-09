import { CURRENCIES } from '../../domain/value-objects/product-details';
import { ApplicationError } from '../../../../shared/domain/application-error';
export class CatalogQuery {
  constructor(
    readonly page = 1,
    readonly limit = 20,
    readonly search?: string,
    readonly categoryId?: string,
    readonly organizationId?: string,
    readonly status?: string,
    readonly brand?: string,
    readonly minPriceMinor?: number,
    readonly maxPriceMinor?: number,
    readonly currency?: string,
  ) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Invalid catalog pagination.',
      );
    if (
      (minPriceMinor !== undefined &&
        (!Number.isInteger(minPriceMinor) ||
          minPriceMinor < 1 ||
          minPriceMinor > 2147483647)) ||
      (maxPriceMinor !== undefined &&
        (!Number.isInteger(maxPriceMinor) ||
          maxPriceMinor < 1 ||
          maxPriceMinor > 2147483647)) ||
      (minPriceMinor !== undefined &&
        maxPriceMinor !== undefined &&
        minPriceMinor > maxPriceMinor) ||
      ((minPriceMinor !== undefined || maxPriceMinor !== undefined) &&
        (!currency || !(CURRENCIES as readonly string[]).includes(currency)))
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Price filters require bounded integer amounts and a currency.',
      );
  }
}
export class ProductQuery {
  constructor(
    readonly id: string,
    readonly actorId?: string,
  ) {}
}
