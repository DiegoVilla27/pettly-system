import { inject, Injectable } from '@angular/core';
import { defer, map, switchMap, of, type Observable } from 'rxjs';
import { uuid } from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import type { ProductsGateway } from '../models/products-gateway';
import type { Context, Filters, Profile, Command } from '../models/product';
import { editable } from '../models/product';
import {
  contextSchema,
  filtersSchema,
  decisionSchema,
  variantProfileSchema,
  validateProfile,
  mapCompany,
  mapCategories,
  mapProduct,
  mapDetail,
  mapPage,
  mapAudit,
  invalid,
  contract,
} from '../mappers/products.mapper';
@Injectable()
export class HttpProductsGateway implements ProductsGateway {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AUTH_SESSION);
  companies(search: string, currentId?: string) {
    if (this.session.identity()?.role !== 'super_admin')
      return of(
        this.session
          .identity()
          ?.organizations.filter(
            (o) =>
              o.status === 'active' &&
              o.type === 'business' &&
              o.permissions.includes('catalog.manage'),
          )
          .filter((o) =>
            o.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
          )
          .map((o) => ({ id: o.organizationId, name: o.name })) ?? [],
      );
    return defer(() => {
      if (search.length > 100 || /\p{Cc}/u.test(search)) throw invalid();
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
          map((dto) => dto.items.map(mapCompany)),
          switchMap((items) => {
            if (!currentId || items.some((c) => c.id === currentId))
              return of(items);
            if (!uuid().safeParse(currentId).success) throw invalid();
            return this.api
              .request('getOrganizationProfile', {
                path: { organizationId: currentId },
              })
              .pipe(map((dto) => [mapCompany(dto), ...items]));
          }),
        );
    });
  }

  private scope(id: string) {
    if (!uuid().safeParse(id).success) throw invalid();
    const u = this.session.identity();
    if (
      u?.role !== 'super_admin' &&
      !u?.organizations.some(
        (o) =>
          o.organizationId === id &&
          o.type === 'business' &&
          o.status === 'active' &&
          o.permissions.includes('catalog.manage'),
      )
    )
      throw new ApiProblem(
        403,
        'FORBIDDEN',
        'No tienes acceso a los productos de esta empresa.',
      );
  }
  categories() {
    return this.api.request('listPublicCategories').pipe(map(mapCategories));
  }
  list(f: Filters) {
    return defer(() => {
      if (!filtersSchema.safeParse(f).success) throw invalid();
      this.scope(f.organizationId);
      return this.api
        .request('listManagedProducts', { query: f })
        .pipe(map((dto) => mapPage(dto, f)));
    });
  }
  get(c: Context) {
    return defer(() => {
      if (!contextSchema.safeParse(c).success) throw invalid();
      this.scope(c.organizationId);
      return this.api
        .request('getManagedProduct', { path: { productId: c.productId } })
        .pipe(
          map((dto) => mapDetail(dto, c)),
          switchMap((d) =>
            this.session.identity()?.role === 'super_admin'
              ? this.api
                  .request('getOrganizationProfile', {
                    path: { organizationId: c.organizationId },
                  })
                  .pipe(
                    map((dto) => {
                      mapCompany(dto);
                      return d;
                    }),
                  )
              : of(d),
          ),
        );
    });
  }
  create(organizationId: string, profile: Profile, reason: string) {
    return defer(() => {
      this.scope(organizationId);
      validateProfile(profile);
      if (!decisionSchema.shape.reason.safeParse(reason).success)
        throw invalid();
      return this.api
        .request('createCatalogProduct', {
          body: { organizationId, profile, currency: 'COP', reason },
        })
        .pipe(
          map((dto) => {
            const p = mapProduct(dto);
            if (p.organizationId !== organizationId || p.currency !== 'COP')
              throw contract();
            return p;
          }),
        );
    });
  }
  execute(c: Command) {
    return this.get(c.context).pipe(
      switchMap((d) => {
        const p = d.product,
          path = { productId: p.id };
        if (
          !decisionSchema.safeParse({
            reason: c.body.reason,
            expectedVersion: c.body.expectedVersion,
          }).success
        )
          throw invalid();
        if (p.version !== c.body.expectedVersion)
          throw new ApiProblem(
            409,
            'CONFLICT',
            'El producto cambió. Actualiza antes de continuar.',
          );
        if (p.currency !== 'COP')
          throw new ApiProblem(
            409,
            'CONFLICT',
            'Este producto histórico no está en COP y es de solo lectura.',
          );
        if (!['submit', 'pause', 'archive'].includes(c.action) && !editable(p))
          throw new ApiProblem(
            409,
            'CONFLICT',
            'El producto no se puede editar en su estado actual.',
          );
        let response: Observable<unknown>;
        switch (c.action) {
          case 'update':
            validateProfile(c.body.profile);
            response = this.api.request('updateCatalogProduct', {
              path,
              body: c.body,
            });
            break;
          case 'variant-create':
            if (
              d.variants.length >= 50 ||
              !variantProfileSchema.safeParse(c.body.profile).success
            )
              throw invalid();
            response = this.api.request('createProductVariant', {
              path,
              body: c.body,
            });
            break;
          case 'variant-update':
            if (
              !d.variants.some(
                (v) => v.id === c.variantId && v.status === 'active',
              ) ||
              !variantProfileSchema.safeParse(c.body.profile).success
            )
              throw invalid();
            response = this.api.request('updateProductVariant', {
              path: { ...path, variantId: c.variantId },
              body: c.body,
            });
            break;
          case 'variant-archive':
            if (
              !d.variants.some(
                (v) => v.id === c.variantId && v.status === 'active',
              )
            )
              throw invalid();
            response = this.api.request('archiveProductVariant', {
              path: { ...path, variantId: c.variantId },
              body: c.body,
            });
            break;
          case 'upload':
            if (
              d.photos.length >= 10 ||
              !['image/jpeg', 'image/png', 'image/webp'].includes(
                c.body.file.type,
              ) ||
              c.body.file.size < 1 ||
              c.body.file.size > 5242880
            )
              throw invalid();
            response = this.api.upload('uploadProductPhoto', path, c.body);
            break;
          case 'remove':
            if (!d.photos.some((x) => x.mediaId === c.mediaId)) throw invalid();
            response = this.api.request('removeProductPhoto', {
              path: { ...path, mediaId: c.mediaId },
              body: c.body,
            });
            break;
          case 'submit':
            if (
              !['draft', 'rejected', 'paused'].includes(p.status) ||
              !d.photos.length ||
              !d.variants.some((v) => v.status === 'active')
            )
              throw new ApiProblem(
                409,
                'CONFLICT',
                'Necesitas un borrador, una variante activa y una fotografía para enviarlo.',
              );
            response = this.api.request('submitCatalogProduct', {
              path,
              body: c.body,
            });
            break;
          case 'pause':
            if (p.status !== 'published') throw invalid();
            response = this.api.request('pauseCatalogProduct', {
              path,
              body: c.body,
            });
            break;
          case 'archive':
            if (p.status === 'archived') throw invalid();
            response = this.api.request('archiveCatalogProduct', {
              path,
              body: c.body,
            });
            break;
        }
        return response.pipe(switchMap(() => this.get(c.context)));
      }),
    );
  }
  audit(c: Context, page: number) {
    return this.get(c).pipe(
      switchMap(() => {
        if (!Number.isInteger(page) || page < 1 || page > 10000)
          throw invalid();
        return this.api
          .request('listProductAudit', {
            path: { productId: c.productId },
            query: { page, limit: 20 },
          })
          .pipe(map((dto) => mapAudit(dto, c, page)));
      }),
    );
  }
  photo(c: Context, mediaId: string) {
    return this.get(c).pipe(
      switchMap((d) => {
        if (
          !uuid().safeParse(mediaId).success ||
          !d.photos.some((p) => p.mediaId === mediaId)
        )
          throw invalid();
        return this.api
          .image('getManagedProductPhoto', { productId: c.productId, mediaId })
          .pipe(
            map((blob) => {
              if (
                blob.type !== 'image/jpeg' ||
                blob.size < 1 ||
                blob.size > 2097152
              )
                throw contract();
              return blob;
            }),
          );
      }),
    );
  }
}
