import { Injectable, inject } from '@angular/core';
import { defer, map } from 'rxjs';
import { ApiClient } from '../../../core/api';
import {
  validId,
  inputProblem,
  contractProblem,
} from '../mappers/services.mapper';
import {
  resourceCreateSchema,
  resourceUpdateSchema,
  blockSchema,
  releaseSchema,
  mapResource,
  mapBlock,
  blockResponseSchema,
  mapResourceAudit,
  mapAvailability,
  validAvailabilityRange,
} from '../mappers/resource.mapper';
import { array, maxLength } from 'zod/mini';
import type { ResourceGateway } from '../models/resource-gateway';
import type {
  ResourceCommand,
  ResourceContext,
  ResourceResult,
  AvailabilityQuery,
} from '../models/resource';
import type { Service, Resource } from '../models/service';
@Injectable()
export class HttpResourceGateway implements ResourceGateway {
  private readonly api = inject(ApiClient);
  execute(c: ResourceCommand) {
    return defer(() => {
      if (c.kind === 'create') {
        if (!resourceCreateSchema.safeParse(c.body).success)
          throw inputProblem();
        return this.api.request('createServiceResource', { body: c.body }).pipe(
          map((dto) => {
            const r = mapResource(dto, c.body.organizationId);
            if (r.version !== 1) throw contractProblem();
            return { kind: 'resource', resource: r } satisfies ResourceResult;
          }),
        );
      }
      validId(c.context.organizationId);
      validId(c.context.resourceId);
      if (c.kind === 'update') {
        if (
          c.body.organizationId !== c.context.organizationId ||
          !resourceUpdateSchema.safeParse(c.body).success
        )
          throw inputProblem();
        return this.api
          .request('updateServiceResource', {
            path: { resourceId: c.context.resourceId },
            body: c.body,
          })
          .pipe(
            map((dto) => {
              const r = mapResource(
                dto,
                c.context.organizationId,
                c.context.resourceId,
              );
              if (r.version !== c.body.expectedVersion + 1)
                throw contractProblem();
              return { kind: 'resource', resource: r } satisfies ResourceResult;
            }),
          );
      }
      if (c.kind === 'block') {
        if (!blockSchema.safeParse(c.body).success) throw inputProblem();
        return this.api
          .request('blockServiceResource', {
            path: { resourceId: c.context.resourceId },
            body: c.body,
          })
          .pipe(
            map((dto) => {
              const b = mapBlock(
                dto,
                c.context.organizationId,
                c.context.resourceId,
              );
              if (
                b.releasedAt ||
                b.startsAt !== c.body.startsAt ||
                b.endsAt !== c.body.endsAt
              )
                throw contractProblem();
              return { kind: 'block', block: b } satisfies ResourceResult;
            }),
          );
      }
      validId(c.blockId);
      if (!releaseSchema.safeParse(c.body).success) throw inputProblem();
      return this.api
        .request('releaseServiceBlock', {
          path: { resourceId: c.context.resourceId, blockId: c.blockId },
          body: c.body,
        })
        .pipe(
          map((dto) => {
            const b = mapBlock(
              dto,
              c.context.organizationId,
              c.context.resourceId,
              c.blockId,
            );
            if (!b.releasedAt) throw contractProblem();
            return { kind: 'block', block: b } satisfies ResourceResult;
          }),
        );
    });
  }
  blocks(c: ResourceContext, from: string, to: string) {
    return defer(() => {
      validId(c.organizationId);
      validId(c.resourceId);
      if (!validAvailabilityBlockQuery(from, to)) throw inputProblem();
      return this.api
        .request('listActiveServiceBlocks', {
          path: { resourceId: c.resourceId },
          query: { from, to },
        })
        .pipe(
          map((dto) => {
            const p = array(blockResponseSchema)
              .check(maxLength(100))
              .safeParse(dto.items);
            if (
              !p.success ||
              new Set(p.data.map((b) => b.id)).size !== p.data.length
            )
              throw contractProblem();
            return p.data.map((b) => {
              const v = mapBlock(b, c.organizationId, c.resourceId);
              if (
                v.releasedAt ||
                Date.parse(v.endsAt) <= Date.parse(from) ||
                Date.parse(v.startsAt) >= Date.parse(to)
              )
                throw contractProblem();
              return v;
            });
          }),
        );
    });
  }
  audit(c: ResourceContext, page: number) {
    return defer(() => {
      validId(c.organizationId);
      validId(c.resourceId);
      if (!Number.isInteger(page) || page < 1 || page > 10000)
        throw inputProblem();
      return this.api
        .request('listServiceResourceAudit', {
          path: { resourceId: c.resourceId },
          query: { page, limit: 20 },
        })
        .pipe(
          map((dto) => mapResourceAudit(dto, c.organizationId, c.resourceId)),
        );
    });
  }
  availability(s: Service, r: Resource, q: AvailabilityQuery) {
    return defer(() => {
      validId(s.id);
      validId(r.id);
      if (
        s.status !== 'published' ||
        r.status !== 'active' ||
        r.organizationId !== s.organizationId ||
        q.resourceId !== r.id ||
        !s.resourceIds.includes(r.id) ||
        !q.from ||
        !q.to ||
        !validAvailabilityRange(q.from, q.to) ||
        !Number.isInteger(q.nights ?? 1) ||
        (q.nights ?? 1) < s.minNights ||
        (q.nights ?? 1) > s.maxNights
      )
        throw inputProblem();
      return this.api
        .request('getServiceAvailability', {
          path: { serviceId: s.id },
          query: q,
        })
        .pipe(map((dto) => mapAvailability(dto, s, r, q)));
    });
  }
}
function validAvailabilityBlockQuery(from: string, to: string) {
  const start = Date.parse(from),
    end = Date.parse(to),
    now = Date.now();
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start > now &&
    end > start &&
    end <= now + 210 * 86400000
  );
}
