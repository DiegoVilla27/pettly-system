import { inject, Injectable } from '@angular/core';
import { defer, map, switchMap, of } from 'rxjs';
import { ApiClient, ApiProblem } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import type { InventoryGateway } from '../models/inventory-gateway';
import type {
  InventoryQuery,
  InventoryContext,
  MovementIntent,
} from '../models/inventory';
import {
  validId,
  mapPage,
  mapLedger,
  mapResult,
  company,
  movementBodySchema,
  inputProblem,
  querySchema,
} from '../mappers/inventory.mapper';
@Injectable()
export class HttpInventoryGateway implements InventoryGateway {
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
              o.permissions.includes('inventory.manage'),
          )
          .filter((o) =>
            o.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
          )
          .map((o) => ({ id: o.organizationId, name: o.name })) ?? [],
      );
    return defer(() => {
      if (search.length > 100 || /\p{Cc}/u.test(search)) throw inputProblem();
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
          map((dto) => dto.items.map(company)),
          switchMap((items) => {
            if (!currentId || items.some((c) => c.id === currentId))
              return of(items);
            validId(currentId);
            return this.api
              .request('getOrganizationProfile', {
                path: { organizationId: currentId },
              })
              .pipe(map((dto) => [company(dto), ...items]));
          }),
        );
    });
  }
  list(query: InventoryQuery) {
    return defer(() => {
      if (!querySchema.safeParse(query).success) throw inputProblem();
      return this.api
        .request('listManagedInventory', { query })
        .pipe(map((dto) => mapPage(dto, query)));
    });
  }
  detail(context: InventoryContext) {
    return defer(() => {
      validId(context.organizationId);
      validId(context.variantId);
      return this.list({
        organizationId: context.organizationId,
        variantId: context.variantId,
        page: 1,
        limit: 1,
      }).pipe(
        map((page) => {
          const row = page.items[0];
          if (!row)
            throw new ApiProblem(
              404,
              'RESOURCE_NOT_FOUND',
              'La variante no pertenece a esta empresa o ya no está disponible.',
            );
          return row;
        }),
      );
    });
  }
  ledger(context: InventoryContext, page: number, limit: number) {
    return defer(() => {
      validId(context.organizationId);
      validId(context.variantId);
      if (
        !Number.isInteger(page) ||
        page < 1 ||
        page > 10000 ||
        ![10, 20, 50].includes(limit)
      )
        throw inputProblem();
      return this.api
        .request('listInventoryMovements', {
          path: { variantId: context.variantId },
          query: { page, limit },
        })
        .pipe(
          map((dto) =>
            mapLedger(
              dto,
              context.organizationId,
              context.variantId,
              page,
              limit,
            ),
          ),
        );
    });
  }
  movement(intent: MovementIntent) {
    return defer(() => {
      validId(intent.organizationId);
      validId(intent.variantId);
      if (!movementBodySchema.safeParse(intent.body).success)
        throw inputProblem();
      return this.api
        .request('recordInventoryMovement', {
          path: { variantId: intent.variantId },
          body: intent.body,
        })
        .pipe(
          map((dto) =>
            mapResult(
              dto,
              intent.organizationId,
              intent.variantId,
              intent.body,
            ),
          ),
        );
    });
  }
}
