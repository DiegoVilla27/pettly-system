import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Category,
  CategoryCommand,
  Audit,
  Page,
  Product,
  ProductDetail,
  QueueFilters,
  ProductReview,
} from './catalog';
export interface CatalogGateway {
  categories(): Observable<Category[]>;
  category(command: CategoryCommand): Observable<Category>;
  categoryAudit(id: string, page: number): Observable<Page<Audit>>;
  queue(filters: QueueFilters): Observable<Page<Product>>;
  preview(id: string): Observable<ProductDetail>;
  photo(productId: string, mediaId: string): Observable<Blob>;
  review(id: string, body: ProductReview): Observable<Product>;
}
export const CATALOG_GATEWAY = new InjectionToken<CatalogGateway>(
  'CATALOG_GATEWAY',
);
