import { AUTH_SESSION } from '../../../core/auth';
import { of, forkJoin, switchMap } from 'rxjs';
import type { PreparationCommand } from '../models/credential';
import {
  createCredentialSchema,
  configureCredentialSchema,
} from '../mappers/veterinary.mapper';
import { inject, Injectable } from '@angular/core';
import { defer, map } from 'rxjs';
import {
  uuid,
  object,
  string,
  nullable,
  array,
  maxLength,
  minLength,
  number,
  int,
  nonnegative,
  iso,
  enum as enumeration,
} from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import {
  mapCredential,
  mapPage,
  mapAudit,
  inputProblem,
  reviewSchema,
  decisionSchema,
} from '../mappers/veterinary.mapper';
import type { VeterinaryGateway } from '../models/veterinary-gateway';
import type {
  CredentialFilters,
  CredentialCommand,
} from '../models/credential';
const optionSchema = object({
  id: uuid(),
  name: string().check(minLength(1), maxLength(200)),
});
const pageSchema = object({
  total: number().check(int(), nonnegative()),
  page: number().check(int(), nonnegative()),
  limit: number().check(int(), nonnegative()),
});
function options(items: unknown) {
  const r = array(optionSchema).check(maxLength(1000)).safeParse(items);
  if (!r.success || new Set(r.data.map((x) => x.id)).size !== r.data.length)
    throw new ApiProblem(
      502,
      'INVALID_RESPONSE',
      'No pudimos validar las opciones.',
    );
  return r.data;
}
@Injectable()
export class HttpVeterinaryGateway implements VeterinaryGateway {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AUTH_SESSION);
  companies(search: string) {
    return defer(() => {
      if (search.length > 100 || /\p{Cc}/u.test(search)) throw inputProblem();
      if (this.session.identity()?.role !== 'super_admin')
        return of(
          this.session
            .identity()
            ?.organizations.filter(
              (o) =>
                o.type === 'business' &&
                o.status === 'active' &&
                o.permissions.includes('services.manage'),
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
          map((dto) => {
            const p = pageSchema.safeParse(dto);
            if (!p.success || dto.page !== 1 || dto.limit !== 20)
              throw new ApiProblem(
                502,
                'INVALID_RESPONSE',
                'No pudimos validar las empresas.',
              );
            return options(dto.items.map((o) => ({ id: o.id, name: o.name })));
          }),
        );
    });
  }
  professionals(organizationId: string, page: number) {
    return defer(() => {
      this.id(organizationId);
      if (!Number.isInteger(page) || page < 1 || page > 10000)
        throw inputProblem();
      const u = this.session.identity();
      if (u?.role !== 'super_admin')
        return of({
          items: u?.organizations.some(
            (o) =>
              o.organizationId === organizationId &&
              o.type === 'business' &&
              o.status === 'active' &&
              o.permissions.includes('services.manage'),
          )
            ? [{ id: u.id, name: u.fullName }]
            : [],
          total: 1,
          page: 1,
          limit: 20,
        });
      return this.api
        .request('listOrganizationMembers', {
          path: { organizationId },
          query: { page, limit: 20 },
        })
        .pipe(
          switchMap((dto) => {
            if (
              !pageSchema.safeParse(dto).success ||
              dto.page !== page ||
              dto.limit !== 20 ||
              dto.items.some(
                (m) =>
                  m.organizationId !== organizationId ||
                  !uuid().safeParse(m.userId).success,
              )
            )
              throw new ApiProblem(
                502,
                'INVALID_RESPONSE',
                'No pudimos validar el equipo.',
              );
            const members = dto.items.filter(
              (m) =>
                m.organizationId === organizationId &&
                ['business_admin', 'business_operator'].includes(m.role),
            );
            if (!members.length) return of({ ...dto, items: [] });
            return forkJoin(
              members.map((m) =>
                this.api.request('getUserAsAdministrator', {
                  path: { userId: m.userId },
                }),
              ),
            ).pipe(
              map((users) => ({
                ...dto,
                items: options(
                  users
                    .filter((x) => x.status === 'active' && !!x.emailVerifiedAt)
                    .map((x) => ({
                      id: x.id,
                      name: [x.name, x.lastName].filter(Boolean).join(' '),
                    })),
                ),
              })),
            );
          }),
        );
    });
  }
  resources(organizationId: string, page: number) {
    return defer(() => {
      this.id(organizationId);
      if (!Number.isInteger(page) || page < 1 || page > 10000)
        throw inputProblem();
      return this.api
        .request('listManagedServiceResources', { query: { organizationId } })
        .pipe(
          map((dto) => {
            const validated = object({
              items: array(
                object({
                  id: uuid(),
                  organizationId: uuid(),
                  name: string().check(minLength(2), maxLength(150)),
                  kind: enumeration(['appointment', 'lodging']),
                  capacity: number().check(int(), nonnegative()),
                  status: enumeration(['active', 'inactive']),
                  createdAt: iso.datetime(),
                  updatedAt: iso.datetime(),
                }),
              ).check(maxLength(1000)),
            }).safeParse(dto);
            if (
              !validated.success ||
              validated.data.items.some(
                (r) => r.organizationId !== organizationId,
              )
            )
              throw new ApiProblem(
                502,
                'INVALID_RESPONSE',
                'No pudimos validar las agendas.',
              );
            const items = validated.data.items
              .filter(
                (r) =>
                  r.organizationId === organizationId &&
                  r.capacity === 1 &&
                  r.status === 'active' &&
                  r.kind === 'appointment',
              )
              .map((r) => ({ id: r.id, name: r.name }));
            return {
              items: items.slice((page - 1) * 20, page * 20),
              total: items.length,
              page,
              limit: 20,
            };
          }),
        );
    });
  }
  mine(filters: import('../models/credential').CredentialFilters) {
    return this.api
      .request('listOwnVeterinaryCredentials', { query: filters })
      .pipe(
        map((dto) => {
          const page = mapPage(dto);
          if (
            page.items.some(
              (c) => c.professionalId !== this.session.identity()?.id,
            )
          )
            throw new ApiProblem(
              502,
              'INVALID_RESPONSE',
              'No pudimos validar tus acreditaciones.',
            );
          return page;
        }),
      );
  }
  prepare(c: PreparationCommand) {
    return defer(() => {
      if (c.kind === 'create') {
        if (!createCredentialSchema.safeParse(c.body).success)
          throw inputProblem();
        return this.api.request('createVeterinaryCredential', { body: c.body });
      }
      this.id(c.credentialId);
      if (c.kind === 'configure') {
        if (!configureCredentialSchema.safeParse(c.body).success)
          throw inputProblem();
        return this.api.request('configureVeterinaryCredential', {
          path: { credentialId: c.credentialId },
          body: c.body,
        });
      }
      if (
        !decisionSchema.safeParse({
          reason: c.body.reason,
          expectedVersion: c.body.expectedVersion,
        }).success
      )
        throw inputProblem();
      if (c.kind === 'submit')
        return this.api.request('submitVeterinaryCredential', {
          path: { credentialId: c.credentialId },
          body: c.body,
        });
      if (c.kind === 'remove') {
        this.id(c.mediaId);
        return this.api.request('removeVeterinaryEvidence', {
          path: { credentialId: c.credentialId, mediaId: c.mediaId },
          body: c.body,
        });
      }
      if (
        ![
          'professional_card',
          'qualification',
          'standing_certificate',
        ].includes(c.body.kind) ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(c.body.file.type) ||
        c.body.file.size < 1 ||
        c.body.file.size > 5242880
      )
        throw inputProblem();
      return this.api.upload(
        'uploadVeterinaryEvidence',
        { credentialId: c.credentialId },
        c.body,
      );
    }).pipe(
      map((dto) => {
        const mapped = mapCredential(
          dto,
          c.kind === 'create' ? undefined : c.credentialId,
        );
        if (
          c.kind !== 'create' &&
          mapped.version !== c.body.expectedVersion + 1
        )
          throw new ApiProblem(
            502,
            'INVALID_RESPONSE',
            'Actualiza la acreditación antes de continuar.',
          );
        return mapped;
      }),
    );
  }

  private id(id: string) {
    if (!uuid().safeParse(id).success) throw inputProblem();
  }
  professional(userId: string) {
    return defer(() => {
      this.id(userId);
      if (userId === this.session.identity()?.id)
        return of({
          id: userId,
          fullName: this.session.identity()?.fullName ?? '',
        });
      return this.api
        .request('getUserAsAdministrator', { path: { userId } })
        .pipe(
          map((dto) => {
            const parsed = object({
              id: uuid(),
              name: string(),
              lastName: nullable(string()),
            }).safeParse(dto);
            if (!parsed.success || parsed.data.id !== userId)
              throw new ApiProblem(
                502,
                'INVALID_RESPONSE',
                'No pudimos validar la identidad profesional.',
              );
            return {
              id: userId,
              fullName: [parsed.data.name, parsed.data.lastName]
                .filter(Boolean)
                .join(' '),
            };
          }),
        );
    });
  }
  list(query: CredentialFilters) {
    return this.api
      .request('listVeterinaryCredentials', { query })
      .pipe(map(mapPage));
  }
  get(credentialId: string) {
    return defer(() => {
      this.id(credentialId);
      return this.api
        .request('getVeterinaryCredential', { path: { credentialId } })
        .pipe(map((dto) => mapCredential(dto, credentialId)));
    });
  }
  audit(credentialId: string, page: number) {
    return defer(() => {
      this.id(credentialId);
      if (!Number.isInteger(page) || page < 1 || page > 10000)
        throw inputProblem();
      return this.api
        .request('listVeterinaryCredentialAudit', {
          path: { credentialId },
          query: { page, limit: 20 },
        })
        .pipe(map((dto) => mapAudit(dto, credentialId, page)));
    });
  }
  evidence(credentialId: string, mediaId: string) {
    return defer(() => {
      this.id(credentialId);
      this.id(mediaId);
      return this.api
        .image('readVeterinaryEvidence', { credentialId, mediaId })
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
                'No pudimos validar la imagen privada.',
              );
            return blob;
          }),
        );
    });
  }
  execute(command: CredentialCommand) {
    return defer(() => {
      this.id(command.credentialId);
      if (
        !(command.kind === 'review' ? reviewSchema : decisionSchema).safeParse(
          command.body,
        ).success
      )
        throw inputProblem();
      const request =
        command.kind === 'review'
          ? this.api.request('reviewVeterinaryCredential', {
              path: { credentialId: command.credentialId },
              body: command.body,
            })
          : this.api.request('revokeVeterinaryCredential', {
              path: { credentialId: command.credentialId },
              body: command.body,
            });
      return request.pipe(
        map((dto) => {
          const credential = mapCredential(dto, command.credentialId);
          const status =
            command.kind === 'revoke'
              ? 'revoked'
              : command.body.approved
                ? 'approved'
                : 'rejected';
          if (
            credential.status !== status ||
            credential.version !== command.body.expectedVersion + 1
          )
            throw new ApiProblem(
              502,
              'INVALID_RESPONSE',
              'No pudimos confirmar la decisión. Consulta el estado actual.',
            );
          return credential;
        }),
      );
    });
  }
}
