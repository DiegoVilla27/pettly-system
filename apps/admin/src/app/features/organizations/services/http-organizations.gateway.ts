import { switchMap } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { defer, map, type Observable } from 'rxjs';
import { uuid, strictObject, enum as enumeration, refine } from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import {
  profileChangesSchema,
  createSchema,
  decisionSchema,
  responsibleSchema,
  mapOrganization,
  mapOrganizationPage,
  mapProfile,
  mapMembers,
  mapAudit,
  mapAccounts,
  textSchema,
} from '../mappers/organizations.mapper';
import type { OrganizationsGateway } from '../models/organizations-gateway';
import type {
  OrganizationCommand,
  OrganizationProfile,
  OrganizationFilters,
  CreateOrganization,
} from '../models/organization';
@Injectable()
export class HttpOrganizationsGateway implements OrganizationsGateway {
  private readonly api = inject(ApiClient);
  mine(query: OrganizationFilters) {
    return this.api
      .request('listMyOrganizations', { query })
      .pipe(map(mapOrganizationPage));
  }
  basic(organizationId: string) {
    return defer(() => {
      this.id(organizationId);
      return this.api
        .request('getOrganization', { path: { organizationId } })
        .pipe(
          map((dto) => {
            const org = mapOrganization(dto);
            if (org.id !== organizationId)
              throw new ApiProblem(
                502,
                'INVALID_RESPONSE',
                'No pudimos validar la organización.',
              );
            return org;
          }),
        );
    });
  }
  list(query: OrganizationFilters) {
    return this.api
      .request('listOrganizations', { query })
      .pipe(map(mapOrganizationPage));
  }
  get(organizationId: string) {
    return defer(() => {
      this.id(organizationId);
      return this.api
        .request('getOrganizationProfile', { path: { organizationId } })
        .pipe(map((dto) => mapProfile(dto, organizationId)));
    });
  }
  members(organizationId: string, page: number) {
    return defer(() => {
      this.id(organizationId);
      this.page(page);
      return this.api
        .request('listOrganizationMembers', {
          path: { organizationId },
          query: { page, limit: 20 },
        })
        .pipe(map((dto) => mapMembers(dto, organizationId)));
    });
  }
  audit(organizationId: string, page: number) {
    return defer(() => {
      this.id(organizationId);
      this.page(page);
      return this.api
        .request('listOrganizationAudit', {
          path: { organizationId },
          query: { page, limit: 20 },
        })
        .pipe(map((dto) => mapAudit(dto, organizationId)));
    });
  }
  accounts(search: string, page: number) {
    return defer(() => {
      this.page(page);
      if (search && !textSchema(100).safeParse(search).success)
        throw this.input();
      return this.api
        .request('listUsers', {
          query: {
            ...(search ? { search } : {}),
            page,
            limit: 20,
            status: 'active',
            emailVerified: 'true',
            sortBy: 'name',
            sortOrder: 'asc',
          },
        })
        .pipe(map(mapAccounts));
    });
  }
  create(body: CreateOrganization) {
    return defer(() => {
      if (!createSchema.safeParse(body).success) throw this.input();
      return this.api
        .request('createOrganization', { body })
        .pipe(map(mapOrganization));
    });
  }
  execute(command: OrganizationCommand): Observable<OrganizationProfile> {
    return defer(() => {
      const { organizationId, body } = command;
      this.id(organizationId);
      switch (command.kind) {
        case 'archive':
          if (!decisionSchema.safeParse(body).success) throw this.input();
          return this.api
            .request('archiveOrganization', {
              path: { organizationId },
              body: command.body,
            })
            .pipe(
              switchMap(() =>
                this.api.request('getOrganizationProfile', {
                  path: { organizationId },
                }),
              ),
            );
        case 'profile':
          if (
            !strictObject({
              profile: profileChangesSchema.check(
                refine((value) => Object.keys(value).length > 0),
              ),
              ...decisionSchema.shape,
            }).safeParse(body).success
          )
            throw this.input();
          return this.api.request('updateOrganizationProfile', {
            path: { organizationId },
            body: command.body,
          });
        case 'submit':
        case 'reject':
          if (!decisionSchema.safeParse(body).success) throw this.input();
          return this.api.request(
            command.kind === 'submit'
              ? 'submitOrganization'
              : 'rejectOrganization',
            { path: { organizationId }, body: command.body },
          );
        case 'approve':
        case 'responsible':
          if (!responsibleSchema.safeParse(body).success) throw this.input();
          return this.api.request(
            command.kind === 'approve'
              ? 'approveOrganization'
              : 'transferOrganizationResponsibility',
            { path: { organizationId }, body: command.body },
          );
        case 'status':
          if (
            !strictObject({
              ...decisionSchema.shape,
              status: enumeration(['active', 'suspended']),
            }).safeParse(body).success
          )
            throw this.input();
          return this.api.request('updateOrganizationStatus', {
            path: { organizationId },
            body: command.body,
          });
      }
    }).pipe(
      map((dto) => {
        const org = mapProfile(dto, command.organizationId);
        const expected =
          command.kind === 'archive'
            ? 'deleted'
            : command.kind === 'approve'
              ? 'active'
              : command.kind === 'reject'
                ? 'rejected'
                : command.kind === 'submit'
                  ? 'pending'
                  : command.kind === 'status'
                    ? command.body.status
                    : null;
        if (
          (expected && org.status !== expected) ||
          ((command.kind === 'approve' || command.kind === 'responsible') &&
            org.responsibleUserId !== command.body.responsibleUserId)
        )
          throw new ApiProblem(
            502,
            'INVALID_RESPONSE',
            'No pudimos validar el resultado. Actualiza los datos antes de continuar.',
          );
        return org;
      }),
    );
  }
  private id(value: string) {
    if (!uuid().safeParse(value).success) throw this.input();
  }
  private page(value: number) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 100000)
      throw this.input();
  }
  private input() {
    return new ApiProblem(
      400,
      'INVALID_INPUT',
      'Revisa los campos antes de continuar.',
    );
  }
}
