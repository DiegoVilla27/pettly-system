import {
  object,
  array,
  uuid,
  string,
  iso,
  number,
  int,
  nonnegative,
  positive,
  maxLength,
} from 'zod/mini';
import { Injectable, inject } from '@angular/core';
import { defer, map, of, switchMap } from 'rxjs';
import { ApiClient } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import type { ServicesGateway } from '../models/services-gateway';
import type {
  ServiceQuery,
  ServiceContext,
  ServiceCommand,
} from '../models/service';
import {
  validId,
  mapCompany,
  mapPage,
  mapService,
  mapResources,
  mapAudit,
  querySchema,
  reviewQuerySchema,
  createSchema,
  updateSchema,
  decisionSchema,
  inputProblem,
  contractProblem,
} from '../mappers/services.mapper';
@Injectable()
export class HttpServicesGateway implements ServicesGateway {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AUTH_SESSION);
  eligible(organizationId: string, page: number) {
    return defer(() => {
      validId(organizationId);
      if (!Number.isInteger(page) || page < 1 || page > 10000)
        throw inputProblem();
      return this.api
        .request('listEligibleVeterinaryCredentials', {
          query: { organizationId, page, limit: 20 },
        })
        .pipe(
          map((dto) => {
            const result = object({
              items: array(
                object({
                  id: uuid(),
                  organizationId: uuid(),
                  professionalId: uuid(),
                  professionalName: string(),
                  resourceId: uuid(),
                  verifiedUntil: iso.datetime(),
                }),
              ).check(maxLength(20)),
              candidateTotal: number().check(int(), nonnegative()),
              page: number().check(int(), positive()),
              limit: number().check(int(), positive()),
            }).safeParse(dto);
            if (
              !result.success ||
              result.data.page !== page ||
              result.data.limit !== 20 ||
              result.data.candidateTotal < result.data.items.length ||
              result.data.items.some(
                (i) => i.organizationId !== organizationId,
              ) ||
              new Set(result.data.items.map((i) => i.id)).size !==
                result.data.items.length
            )
              throw contractProblem();
            return result.data;
          }),
        );
    });
  }
  companies(search: string, currentId?: string) {
    return defer(() => {
      if (search.length > 100 || /\p{Cc}/u.test(search)) throw inputProblem();
      if (this.session.identity()?.role !== 'super_admin')
        return of(
          this.session
            .identity()
            ?.organizations.filter(
              (o) =>
                o.status === 'active' &&
                o.type === 'business' &&
                o.permissions.includes('services.manage') &&
                o.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
            )
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
          map((dto) => dto.items.map(mapCompany)),
          switchMap((items) => {
            if (!currentId || items.some((c) => c.id === currentId))
              return of(items);
            validId(currentId);
            return this.api
              .request('getOrganizationProfile', {
                path: { organizationId: currentId },
              })
              .pipe(map((dto) => [mapCompany(dto), ...items]));
          }),
        );
    });
  }
  list(query: ServiceQuery | { page: number; limit: number }, review: boolean) {
    return defer(() => {
      if (review) {
        if (!reviewQuerySchema.safeParse(query).success) throw inputProblem();
        return this.api
          .request('listServiceModerationQueue', {
            query: { page: query.page, limit: query.limit },
          })
          .pipe(
            map((dto) =>
              mapPage(dto, query.page, query.limit, undefined, true),
            ),
          );
      }
      const parsed = querySchema.safeParse(query);
      if (!parsed.success) throw inputProblem();
      return this.api
        .request('listManagedServices', { query: parsed.data })
        .pipe(
          map((dto) =>
            mapPage(dto, query.page, query.limit, parsed.data.organizationId),
          ),
        );
    });
  }
  get(context: ServiceContext) {
    return defer(() => {
      validId(context.id);
      if (!context.review) validId(context.organizationId);
      return (
        context.review
          ? this.api.request('getServiceReviewPreview', {
              path: { serviceId: context.id },
            })
          : this.api.request('getManagedService', {
              path: { serviceId: context.id },
            })
      ).pipe(
        map((dto) => {
          const service = mapService(
            dto,
            context.id,
            context.review ? undefined : context.organizationId,
          );
          if (context.review && service.status !== 'pending')
            throw contractProblem();
          return service;
        }),
      );
    });
  }
  resources(organizationId: string) {
    return defer(() => {
      validId(organizationId);
      return this.api
        .request('listManagedServiceResources', { query: { organizationId } })
        .pipe(map((dto) => mapResources(dto, organizationId)));
    });
  }
  audit(context: ServiceContext, page: number) {
    return defer(() => {
      validId(context.id);
      validId(context.organizationId);
      if (!Number.isInteger(page) || page < 1 || page > 10000)
        throw inputProblem();
      return this.api
        .request('listServiceAudit', {
          path: { serviceId: context.id },
          query: { page, limit: 20 },
        })
        .pipe(map((dto) => mapAudit(dto, context.id, context.organizationId)));
    });
  }
  execute(command: ServiceCommand) {
    return defer(() => {
      if (command.kind === 'create') {
        if (!createSchema.safeParse(command.body).success) throw inputProblem();
        return this.api.request('createService', { body: command.body }).pipe(
          map((dto) => {
            const s = mapService(dto, undefined, command.body.organizationId);
            if (s.status !== 'draft' || s.version !== 1)
              throw contractProblem();
            return s;
          }),
        );
      }
      validId(command.id);
      if (command.kind === 'update') {
        if (!updateSchema.safeParse(command.body).success) throw inputProblem();
        return this.api
          .request('updateService', {
            path: { serviceId: command.id },
            body: command.body,
          })
          .pipe(
            map((dto) => {
              const s = mapService(
                dto,
                command.id,
                command.body.organizationId,
              );
              if (
                s.version !== command.body.expectedVersion + 1 ||
                s.status !== 'draft'
              )
                throw contractProblem();
              return s;
            }),
          );
      }
      validId(command.organizationId);
      if (!decisionSchema.safeParse(command.body).success) throw inputProblem();
      const path = { serviceId: command.id },
        body = command.body;
      const request =
        command.kind === 'submit'
          ? this.api.request('submitService', { path, body })
          : command.kind === 'pause'
            ? this.api.request('pauseService', { path, body })
            : command.kind === 'archive'
              ? this.api.request('archiveService', { path, body })
              : this.api.request('reviewService', {
                  path,
                  body: { ...body, approved: command.kind === 'approve' },
                });
      const expected = {
        submit: 'pending',
        pause: 'paused',
        archive: 'archived',
        approve: 'published',
        reject: 'rejected',
      } as const;
      return request.pipe(
        map((dto) => {
          const s = mapService(dto, command.id, command.organizationId);
          if (
            s.version !== body.expectedVersion + 1 ||
            s.status !== expected[command.kind]
          )
            throw contractProblem();
          return s;
        }),
      );
    });
  }
}
