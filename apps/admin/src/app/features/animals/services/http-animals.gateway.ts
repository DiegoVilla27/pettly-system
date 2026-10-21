import { Injectable, inject } from '@angular/core';
import { defer, map, of, switchMap } from 'rxjs';
import { uuid } from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import type { AnimalsGateway } from '../models/animals-gateway';
import type {
  AnimalContext,
  AnimalQuery,
  AnimalProfile,
  AnimalCommand,
} from '../models/animal';
import {
  contextSchema,
  querySchema,
  decisionSchema,
  updateSchema,
  mapShelter,
  mapPage,
  mapAnimal,
  mapRecord,
  mapAudit,
  validateProfile,
  inputProblem,
} from '../mappers/animals.mapper';
@Injectable()
export class HttpAnimalsGateway implements AnimalsGateway {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AUTH_SESSION);
  shelters(search: string, currentId?: string) {
    return defer(() => {
      if (search.length > 100 || /\p{Cc}/u.test(search)) throw inputProblem();
      if (this.session.identity()?.role !== 'super_admin')
        return of(
          this.session
            .identity()
            ?.organizations.filter(
              (o) =>
                o.status === 'active' &&
                o.type === 'adoption_entity' &&
                o.permissions.includes('animals.manage') &&
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
            if (!uuid().safeParse(currentId).success) throw inputProblem();
            return this.api
              .request('getOrganizationProfile', {
                path: { organizationId: currentId },
              })
              .pipe(map((dto) => [mapShelter(dto), ...items]));
          }),
        );
    });
  }

  private requireScope(organizationId: string) {
    if (!uuid().safeParse(organizationId).success) throw inputProblem();
    const u = this.session.identity();
    if (
      u?.role !== 'super_admin' &&
      !u?.organizations.some(
        (o) =>
          o.organizationId === organizationId &&
          o.type === 'adoption_entity' &&
          o.status === 'active' &&
          o.permissions.includes('animals.manage'),
      )
    )
      throw new ApiProblem(
        403,
        'FORBIDDEN',
        'No tienes acceso a los animales de este refugio.',
      );
  }
  private context(c: AnimalContext) {
    if (!contextSchema.safeParse(c).success) throw inputProblem();
    this.requireScope(c.organizationId);
  }
  list(q: AnimalQuery) {
    return defer(() => {
      const p = querySchema.safeParse(q);
      if (!p.success) throw inputProblem();
      this.requireScope(p.data.organizationId);
      return this.api
        .request('listAnimals', { query: p.data })
        .pipe(map((dto) => mapPage(dto, p.data)));
    });
  }
  get(c: AnimalContext) {
    return defer(() => {
      this.context(c);
      return this.api
        .request('getAnimal', { path: { animalId: c.animalId } })
        .pipe(map((dto) => mapAnimal(dto, c)));
    });
  }
  create(organizationId: string, profile: AnimalProfile, reason: string) {
    return defer(() => {
      this.requireScope(organizationId);
      const p = validateProfile(profile);
      if (!reasonSchema.safeParse(reason).success) throw inputProblem();
      return this.api
        .request('createAnimal', {
          body: { organizationId, profile: p, reason },
        })
        .pipe(map((dto) => mapRecord(dto, organizationId)));
    });
  }
  audit(c: AnimalContext, page: number) {
    return this.get(c).pipe(
      switchMap(() => {
        if (!Number.isInteger(page) || page < 1 || page > 100000)
          throw inputProblem();
        return this.api
          .request('listAnimalAudit', {
            path: { animalId: c.animalId },
            query: { page, limit: 20 },
          })
          .pipe(map((dto) => mapAudit(dto, c, page)));
      }),
    );
  }
  photo(c: AnimalContext, mediaId: string) {
    return this.get(c).pipe(
      switchMap((a) => {
        if (
          !uuid().safeParse(mediaId).success ||
          !a.photos.some((p) => p.mediaId === mediaId)
        )
          throw inputProblem();
        return this.api
          .image('getPrivateAnimalPhoto', { animalId: c.animalId, mediaId })
          .pipe(
            map((blob) => {
              if (
                blob.type !== 'image/jpeg' ||
                blob.size <= 0 ||
                blob.size > 2097152
              )
                throw new ApiProblem(
                  502,
                  'INVALID_RESPONSE',
                  'No pudimos validar la fotografía.',
                );
              return blob;
            }),
          );
      }),
    );
  }
  execute(command: AnimalCommand) {
    return defer(() => {
      this.context(command.context);
      if (
        !decisionSchema.safeParse({
          reason: command.body.reason,
          expectedVersion: command.body.expectedVersion,
        }).success
      )
        throw inputProblem();
      if (
        command.action === 'update' &&
        !updateSchema.safeParse(command.body).success
      )
        throw inputProblem();
      if (command.action === 'deceased' && command.body.status !== 'deceased')
        throw inputProblem();
      if (
        command.action === 'remove' &&
        !uuid().safeParse(command.mediaId).success
      )
        throw inputProblem();
      if (
        command.action === 'upload' &&
        (!(command.body.file instanceof File) ||
          !['image/jpeg', 'image/png', 'image/webp'].includes(
            command.body.file.type,
          ) ||
          command.body.file.size < 1 ||
          command.body.file.size > 5242880)
      )
        throw inputProblem();
      return this.get(command.context).pipe(
        switchMap((current) => {
          if (current.version !== command.body.expectedVersion)
            throw new ApiProblem(
              409,
              'CONFLICT',
              'El animal cambió. Actualiza antes de continuar.',
            );
          const path = { animalId: command.context.animalId };
          const request =
            command.action === 'update'
              ? this.api.request('updateAnimal', { path, body: command.body })
              : command.action === 'deceased'
                ? this.api.request('updateAnimalStatus', {
                    path,
                    body: command.body,
                  })
                : command.action === 'archive'
                  ? this.api.request('archiveAnimal', {
                      path,
                      body: command.body,
                    })
                  : command.action === 'upload'
                    ? this.api.upload('uploadAnimalPhoto', path, command.body)
                    : this.api.request('removeAnimalPhoto', {
                        path: { ...path, mediaId: command.mediaId },
                        body: command.body,
                      });
          return request.pipe(
            map((dto) => {
              const record = mapRecord(dto, command.context.organizationId);
              if (record.id !== command.context.animalId)
                throw new ApiProblem(
                  502,
                  'INVALID_RESPONSE',
                  'No pudimos validar el animal actualizado.',
                );
              return record;
            }),
            switchMap(() => this.get(command.context)),
          );
        }),
      );
    });
  }
}
