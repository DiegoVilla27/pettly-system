import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Company,
  Category,
  Context,
  Filters,
  Profile,
  Product,
  ProductDetail,
  ProductPage,
  ProductAudit,
  Command,
} from './product';
export interface ProductsGateway {
  companies(search: string, currentId?: string): Observable<Company[]>;
  categories(): Observable<Category[]>;
  list(filters: Filters): Observable<ProductPage>;
  get(context: Context): Observable<ProductDetail>;
  create(
    organizationId: string,
    profile: Profile,
    reason: string,
  ): Observable<Product>;
  execute(command: Command): Observable<ProductDetail>;
  audit(context: Context, page: number): Observable<ProductAudit>;
  photo(context: Context, mediaId: string): Observable<Blob>;
}
export const PRODUCTS_GATEWAY = new InjectionToken<ProductsGateway>(
  'PRODUCTS_GATEWAY',
);
