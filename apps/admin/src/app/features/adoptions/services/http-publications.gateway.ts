import { Injectable, inject } from '@angular/core';
import { defer, of, map, switchMap } from 'rxjs';
import type { Observable } from 'rxjs';
import { uuid, object, literal, string, minLength, maxLength } from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import type { PublicationsGateway } from '../models/publications-gateway';
import type {
  Context,
  Filters,
  Profile,
  Command,
  Shelter,
} from '../models/publication';
import {
  contextSchema,
  filtersSchema,
  decisionSchema,
  mapPublication,
  mapPage,
  mapCandidate,
  mapAudit,
  validateProfile,
  invalid,
  contract,
} from '../mappers/publications.mapper';
const mapShelter = (dto: unknown): Shelter => {
  const r = object({
    id: uuid(),
    name: string().check(minLength(1), maxLength(150)),
    type: literal('adoption_entity'),
    status: literal('active'),
  }).safeParse(dto);
  if (!r.success) throw contract();
  return { id: r.data.id, name: r.data.name };
};
@Injectable()
export class HttpPublicationsGateway implements PublicationsGateway {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AUTH_SESSION);
  shelters(search: string, currentId?: string) {
    return defer(() => {
      if (search.length > 100 || /\p{Cc}/u.test(search)) throw invalid();
      if (this.session.identity()?.role !== 'super_admin')
        return of(
          this.session
            .identity()
            ?.organizations.filter(
              (o) =>
                o.status === 'active' &&
                o.type === 'adoption_entity' &&
                o.permissions.includes('adoptions.publications.manage') &&
                o.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
            )
            .map((o) => ({ id: o.organizationId, name: o.name })) ?? [],
        );
      return this.api
        .request('listOrganizations', {
          query: {
            type: 'adoption_entity',
            status: 'active',
            search: search.trim() || undefined,
            page: 1,
            limit: 20,
          },
        })
        .pipe(
          map((dto) => dto.items.map(mapShelter)),
          switchMap((items) => {
            if (!currentId || items.some((c) => c.id === currentId))
              return of(items);
            if (!uuid().safeParse(currentId).success) throw invalid();
            return this.api
              .request('getOrganizationProfile', {
                path: { organizationId: currentId },
              })
              .pipe(map((dto) => [mapShelter(dto), ...items]));
          }),
        );
    });
  }
  private requireScope(id: string) {
    if (!uuid().safeParse(id).success) throw invalid();
    const u = this.session.identity();
    if (
      u?.role !== 'super_admin' &&
      !u?.organizations.some(
        (o) =>
          o.organizationId === id &&
          o.status === 'active' &&
          o.type === 'adoption_entity' &&
          o.permissions.includes('adoptions.publications.manage'),
      )
    )
      throw new ApiProblem(
        403,
        'FORBIDDEN',
        'No tienes acceso a las publicaciones de este refugio.',
      );
  }
  private context(c: Context) {
    if (!contextSchema.safeParse(c).success) throw invalid();
    if (c.review) {
      if (!this.session.hasPermission('moderation.publications.review'))
        throw new ApiProblem(
          403,
          'FORBIDDEN',
          'No tienes permiso de revisión.',
        );
    } else this.requireScope(c.organizationId ?? '');
  }
  candidate(organizationId: string, animalId: string) {
    return defer(() => {
      this.requireScope(organizationId);
      if (!uuid().safeParse(animalId).success) throw invalid();
      return this.api.request('getAnimal', { path: { animalId } }).pipe(
        map((dto) => {
          const a = mapCandidate(dto, organizationId);
          if (a.id !== animalId) throw contract();
          return a;
        }),
      );
    });
  }
  list(f: Filters) {
    return defer(() => {
      if (!filtersSchema.safeParse(f).success) throw invalid();
      if (f.review) {
        if (!this.session.hasPermission('moderation.publications.review'))
          throw new ApiProblem(
            403,
            'FORBIDDEN',
            'No tienes permiso de revisión.',
          );
        return this.api
          .request('listAdoptionModerationQueue', {
            query: { page: f.page, limit: f.limit },
          })
          .pipe(map((dto) => mapPage(dto, f)));
      }
      const organizationId = f.organizationId ?? '';
      this.requireScope(organizationId);
      return this.api
        .request('listManagedAdoptionPublications', {
          path: { organizationId },
          query: { page: f.page, limit: f.limit, status: f.status },
        })
        .pipe(map((dto) => mapPage(dto, f)));
    });
  }
  get(c: Context) {
    return defer(() => {
      this.context(c);
      return this.api
        .request('getManagedAdoptionPublication', {
          path: { publicationId: c.publicationId },
        })
        .pipe(
          map((dto) => mapPublication(dto, c)),
          switchMap((p) =>
            !c.review && this.session.identity()?.role === 'super_admin'
              ? this.api
                  .request('getOrganizationProfile', {
                    path: { organizationId: p.organizationId },
                  })
                  .pipe(
                    map((dto) => {
                      mapShelter(dto);
                      return p;
                    }),
                  )
              : of(p),
          ),
        );
    });
  }
  create(
    organizationId: string,
    animalId: string,
    profile: Profile,
    reason: string,
  ) {
    return this.candidate(organizationId, animalId).pipe(
      switchMap(() => {
        if (!reasonSchema.safeParse(reason).success) throw invalid();
        return this.api
          .request('createAdoptionPublication', {
            body: { animalId, profile: validateProfile(profile), reason },
          })
          .pipe(
            map((dto) => {
              const p = mapPublication(dto);
              if (
                p.organizationId !== organizationId ||
                p.animalId !== animalId
              )
                throw contract();
              return p;
            }),
          );
      }),
    );
  }
  execute(c: Command) {
    return this.get(c.context).pipe(
      switchMap((p) => {
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
            'La publicación cambió. Actualiza antes de continuar.',
          );
        if (c.action === 'review') {
          const u = this.session.identity();
          if (
            !c.context.review ||
            typeof c.body.approved !== 'boolean' ||
            p.createdBy === u?.id ||
            u?.organizations.some((o) => o.organizationId === p.organizationId)
          )
            throw new ApiProblem(
              403,
              'FORBIDDEN',
              'La revisión debe ser independiente del creador y del refugio.',
            );
        } else {
          if (c.context.review)
            throw new ApiProblem(
              403,
              'FORBIDDEN',
              'Las acciones operativas requieren el contexto del refugio.',
            );
          this.requireScope(p.organizationId);
        }
        if (c.action === 'update') validateProfile(c.body.profile);
        const path = { publicationId: p.id };
        const request: Observable<unknown> =
          c.action === 'update'
            ? this.api.request('updateAdoptionPublication', {
                path,
                body: c.body,
              })
            : c.action === 'review'
              ? this.api.request('reviewAdoptionPublication', {
                  path,
                  body: c.body,
                })
              : c.action === 'submit'
                ? this.api.request('submitAdoptionPublication', {
                    path,
                    body: c.body,
                  })
                : c.action === 'pause'
                  ? this.api.request('pauseAdoptionPublication', {
                      path,
                      body: c.body,
                    })
                  : this.api.request('archiveAdoptionPublication', {
                      path,
                      body: c.body,
                    });
        return request.pipe(switchMap(() => this.get(c.context)));
      }),
    );
  }
  audit(c: Context, page: number) {
    if (c.review) throw invalid();
    return this.get(c).pipe(
      switchMap(() => {
        if (!Number.isInteger(page) || page < 1 || page > 100000)
          throw invalid();
        return this.api
          .request('listAdoptionAudit', {
            path: { publicationId: c.publicationId },
            query: { page, limit: 20 },
          })
          .pipe(map((dto) => mapAudit(dto, c, page)));
      }),
    );
  }
  photo(c: Context, mediaId: string) {
    return this.get(c).pipe(
      switchMap((p) => {
        if (
          !uuid().safeParse(mediaId).success ||
          !p.snapshot?.photos.some((x) => x.mediaId === mediaId)
        )
          throw invalid();
        return this.api
          .image('getManagedAdoptionPhoto', { publicationId: p.id, mediaId })
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
