import { inject, Injectable } from '@angular/core';
import { defer, map } from 'rxjs';
import { uuid } from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import type { CatalogGateway } from '../models/catalog-gateway';
import type {
  CategoryCommand,
  QueueFilters,
  ProductReview,
} from '../models/catalog';
import {
  mapCategory,
  mapCategories,
  mapCategoryAudit,
  mapQueue,
  mapDetail,
  mapProduct,
  validCategoryCommand,
  inputProblem,
  reviewSchema,
} from '../mappers/catalog.mapper';
@Injectable()
export class HttpCatalogGateway implements CatalogGateway {
  private readonly api = inject(ApiClient);
  private id(id: string) {
    if (!uuid().safeParse(id).success) throw inputProblem();
  }
  categories() {
    return this.api.request('listManagedCategories').pipe(map(mapCategories));
  }
  category(command: CategoryCommand) {
    return defer(() => {
      if (!validCategoryCommand(command)) throw inputProblem();
      const request =
        command.kind === 'create'
          ? this.api.request('createProductCategory', { body: command.body })
          : this.update(command);
      return request.pipe(
        map((dto) => {
          const c = mapCategory(dto);
          if (
            command.kind === 'update' &&
            (c.id !== command.id ||
              c.version !== command.body.expectedVersion + 1)
          )
            throw new ApiProblem(
              502,
              'INVALID_RESPONSE',
              'No pudimos confirmar la actualización. Consulta la categoría.',
            );
          return c;
        }),
      );
    });
  }
  private update(command: Extract<CategoryCommand, { kind: 'update' }>) {
    this.id(command.id);
    return this.api.request('updateProductCategory', {
      path: { categoryId: command.id },
      body: command.body,
    });
  }
  categoryAudit(categoryId: string, page: number) {
    return defer(() => {
      this.id(categoryId);
      if (!Number.isInteger(page) || page < 1 || page > 10000)
        throw inputProblem();
      return this.api
        .request('listCategoryAudit', {
          path: { categoryId },
          query: { page, limit: 20 },
        })
        .pipe(map((dto) => mapCategoryAudit(dto, categoryId)));
    });
  }
  queue(query: QueueFilters) {
    return this.api
      .request('listProductModerationQueue', { query })
      .pipe(map(mapQueue));
  }
  preview(productId: string) {
    return defer(() => {
      this.id(productId);
      return this.api
        .request('getProductReviewPreview', { path: { productId } })
        .pipe(map((dto) => mapDetail(dto, productId)));
    });
  }
  photo(productId: string, mediaId: string) {
    return defer(() => {
      this.id(productId);
      this.id(mediaId);
      return this.api
        .image('getProductReviewPhoto', { productId, mediaId })
        .pipe(
          map((blob) => {
            if (
              blob.type !== 'image/jpeg' ||
              blob.size === 0 ||
              blob.size > 2 * 1024 * 1024
            )
              throw new ApiProblem(
                502,
                'INVALID_RESPONSE',
                'No pudimos validar la fotografía.',
              );
            return blob;
          }),
        );
    });
  }
  review(productId: string, body: ProductReview) {
    return defer(() => {
      this.id(productId);
      if (!reviewSchema.safeParse(body).success) throw inputProblem();
      return this.api
        .request('reviewCatalogProduct', { path: { productId }, body })
        .pipe(
          map((dto) => {
            const p = mapProduct(dto, productId);
            if (
              p.status !== (body.approved ? 'published' : 'rejected') ||
              p.version !== body.expectedVersion + 1
            )
              throw new ApiProblem(
                502,
                'INVALID_RESPONSE',
                'No pudimos confirmar la decisión. Consulta la cola de revisión.',
              );
            return p;
          }),
        );
    });
  }
}
