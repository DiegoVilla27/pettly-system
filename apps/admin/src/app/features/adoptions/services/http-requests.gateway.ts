import { inject, Injectable } from '@angular/core';
import { defer, map, switchMap } from 'rxjs';
import { ApiClient, ApiProblem } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import { PUBLICATIONS_GATEWAY } from '../models/publications-gateway';
import type { RequestsGateway } from '../models/requests-gateway';
import type {
  RequestContext,
  RequestFilters,
  RequestCommand,
} from '../models/adoption-request';
import { requestActions } from '../models/adoption-request';
import {
  validateRequestContext,
  mapRequest,
  mapRequestItem,
  mapRequestPage,
  requestFiltersSchema,
  reviewRequestSchema,
} from '../mappers/requests.mapper';
import { decisionSchema, invalid } from '../mappers/publications.mapper';
@Injectable()
export class HttpRequestsGateway implements RequestsGateway {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AUTH_SESSION);
  private readonly publications = inject(PUBLICATIONS_GATEWAY);
  private scope(c: RequestContext) {
    validateRequestContext({
      organizationId: c.organizationId,
      publicationId: c.publicationId,
      adoptionRequestId: c.adoptionRequestId,
    });
    const u = this.session.identity();
    if (
      u?.role !== 'super_admin' &&
      !u?.organizations.some(
        (o) =>
          o.organizationId === c.organizationId &&
          o.type === 'adoption_entity' &&
          o.status === 'active' &&
          o.permissions.includes('adoptions.requests.review'),
      )
    )
      throw new ApiProblem(
        403,
        'FORBIDDEN',
        'No tienes acceso a las solicitudes de este refugio.',
      );
    return this.publications.get({
      organizationId: c.organizationId,
      publicationId: c.publicationId,
      review: false,
    });
  }
  list(f: RequestFilters) {
    return defer(() => {
      if (!requestFiltersSchema.safeParse(f).success) throw invalid();
      return this.scope(f).pipe(
        switchMap((publication) =>
          this.api
            .request('listShelterAdoptionRequests', {
              path: { publicationId: f.publicationId },
              query: { page: f.page, limit: f.limit, status: f.status },
            })
            .pipe(
              map((dto) => ({ publication, page: mapRequestPage(dto, f) })),
            ),
        ),
      );
    });
  }
  get(c: RequestContext) {
    return defer(() => {
      validateRequestContext(c, true);
      const adoptionRequestId = c.adoptionRequestId;
      if (!adoptionRequestId) throw invalid();
      return this.scope(c).pipe(
        switchMap((publication) =>
          this.api
            .request('getAdoptionRequest', {
              path: { adoptionRequestId },
            })
            .pipe(map((dto) => ({ publication, request: mapRequest(dto, c) }))),
        ),
      );
    });
  }
  execute(c: RequestCommand) {
    return this.get(c.context).pipe(
      switchMap((d) => {
        if (
          !(
            c.action === 'complete' ? decisionSchema : reviewRequestSchema
          ).safeParse(c.body).success
        )
          throw invalid();
        if (d.request.version !== c.body.expectedVersion)
          throw new ApiProblem(
            409,
            'CONFLICT',
            'La solicitud cambió. Actualiza antes de continuar.',
          );
        const action = c.action === 'complete' ? 'complete' : c.body.status;
        if (
          !requestActions(d, this.session.identity()?.id).some(
            (x) => x.value === action,
          )
        )
          throw new ApiProblem(
            409,
            'CONFLICT',
            'La acción no corresponde al estado o consentimiento actual.',
          );
        const adoptionRequestId = c.context.adoptionRequestId;
        if (!adoptionRequestId) throw invalid();
        const path = { adoptionRequestId };
        const response =
          c.action === 'complete'
            ? this.api.request('completeAdoptionRequest', {
                path,
                body: c.body,
              })
            : this.api.request('reviewAdoptionRequest', { path, body: c.body });
        return response.pipe(
          map((dto) => mapRequestItem(dto, c.context)),
          switchMap(() => this.get(c.context)),
        );
      }),
    );
  }
}
