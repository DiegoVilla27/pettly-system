import { Injectable, inject } from '@angular/core';
import { defer, map, of, switchMap } from 'rxjs';
import {
  uuid,
  object,
  array,
  string,
  number,
  int,
  nonnegative,
  maxLength,
  minLength,
} from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import {
  mapPolicy,
  mapAudit,
  validateRequest,
  invalid,
} from '../mappers/commercial.mapper';
import type { CommercialGateway, PolicyRequest } from '../models/commercial';
const names = object({
  id: uuid(),
  name: string().check(minLength(1), maxLength(250)),
});
const variantPageSchema = object({
  items: array(
    object({
      product: object({
        id: uuid(),
        organizationId: uuid(),
        name: string().check(minLength(2), maxLength(150)),
      }),
      variants: array(
        object({
          id: uuid(),
          organizationId: uuid(),
          productId: uuid(),
          sku: string().check(minLength(1), maxLength(64)),
        }),
      ).check(maxLength(50)),
    }),
  ).check(maxLength(20)),
  total: number().check(int(), nonnegative()),
  page: number().check(int(), nonnegative()),
  limit: number().check(int(), nonnegative()),
});
function companies(items: unknown) {
  const r = array(names).check(maxLength(21)).safeParse(items);
  if (!r.success || new Set(r.data.map((o) => o.id)).size !== r.data.length)
    throw new ApiProblem(
      502,
      'INVALID_RESPONSE',
      'No pudimos validar las empresas.',
    );
  return r.data;
}
@Injectable()
export class HttpCommercialGateway implements CommercialGateway {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AUTH_SESSION);
  private scope(id: string) {
    if (!uuid().safeParse(id).success) throw invalid();
    if (
      this.session.identity()?.role !== 'super_admin' &&
      !this.session.hasPermission('orders.settings.manage', id)
    )
      throw new ApiProblem(
        403,
        'FORBIDDEN',
        'No puedes configurar esta empresa.',
      );
  }
  companies(search: string, currentId?: string) {
    return defer(() => {
      if (search.length > 100 || /\p{Cc}/u.test(search)) throw invalid();
      if (this.session.identity()?.role !== 'super_admin')
        return of(
          this.session
            .identity()
            ?.organizations.filter(
              (o) =>
                o.type === 'business' &&
                o.status === 'active' &&
                o.permissions.includes('orders.settings.manage'),
            )
            .filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
            .map((o) => ({ id: o.organizationId, name: o.name })) ?? [],
        );
      return this.api
        .request('listOrganizations', {
          query: {
            type: 'business',
            status: 'active',
            search: search.trim() || undefined,
            page: 1,
            limit: 20,
          },
        })
        .pipe(
          switchMap((dto) => {
            const items = companies(
              dto.items.map((o) => ({ id: o.id, name: o.name })),
            );
            if (!currentId || items.some((i) => i.id === currentId))
              return of(items);
            this.scope(currentId);
            return this.api
              .request('getOrganization', {
                path: { organizationId: currentId },
              })
              .pipe(
                map((o) => {
                  if (o.type !== 'business' || o.status !== 'active')
                    throw new ApiProblem(
                      403,
                      'FORBIDDEN',
                      'Selecciona una empresa activa.',
                    );
                  if (o.id !== currentId)
                    throw new ApiProblem(
                      502,
                      'INVALID_RESPONSE',
                      'No pudimos validar la empresa.',
                    );
                  return companies([...items, { id: o.id, name: o.name }]);
                }),
              );
          }),
        );
    });
  }
  get(id: string) {
    return defer(() => {
      this.scope(id);
      return this.api
        .request('getCommercialPolicy', { path: { organizationId: id } })
        .pipe(map((dto) => mapPolicy(dto, id)));
    });
  }
  audit(id: string, page: number) {
    return defer(() => {
      this.scope(id);
      if (!Number.isInteger(page) || page < 1 || page > 10000) throw invalid();
      return this.api
        .request('listCommercialPolicyAudits', {
          path: { organizationId: id },
          query: { page, limit: 20 },
        })
        .pipe(map((dto) => mapAudit(dto, id, page)));
    });
  }
  variants(id: string, page: number, search: string) {
    return defer(() => {
      this.scope(id);
      if (
        !Number.isInteger(page) ||
        page < 1 ||
        page > 10000 ||
        search.length > 100 ||
        /\p{Cc}/u.test(search)
      )
        throw invalid();
      return this.api
        .request('listManagedProducts', {
          query: {
            organizationId: id,
            page,
            limit: 20,
            search: search.trim() || undefined,
          },
        })
        .pipe(
          map((dto) => {
            if (!variantPageSchema.safeParse(dto).success)
              throw new ApiProblem(
                502,
                'INVALID_RESPONSE',
                'No pudimos validar las variantes.',
              );
            if (
              dto.page !== page ||
              dto.limit !== 20 ||
              dto.items.some(
                (d) =>
                  d.product.organizationId !== id ||
                  d.variants.some(
                    (v) =>
                      v.organizationId !== id || v.productId !== d.product.id,
                  ),
              )
            )
              throw new ApiProblem(
                502,
                'INVALID_RESPONSE',
                'No pudimos validar las variantes.',
              );
            return {
              items: dto.items.flatMap((d) =>
                d.variants.map((v) => ({
                  id: v.id,
                  name: d.product.name + ' · ' + v.sku,
                })),
              ),
              candidateTotal: dto.total,
              page,
              limit: 20,
            };
          }),
        );
    });
  }
  save(id: string, body: PolicyRequest) {
    return defer(() => {
      this.scope(id);
      validateRequest(body);
      return this.api
        .request('configureCommercialPolicy', {
          path: { organizationId: id },
          body,
        })
        .pipe(
          map((dto) => {
            const policy = mapPolicy(dto, id);
            if (!policy || policy.version !== body.expectedVersion + 1)
              throw new ApiProblem(
                502,
                'INVALID_RESPONSE',
                'Comprueba las condiciones actuales antes de continuar.',
              );
            return policy;
          }),
        );
    });
  }
}
