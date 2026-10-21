import { inject, Injectable } from '@angular/core';
import { defer, map, type Observable } from 'rxjs';
import {
  object,
  strictObject,
  email,
  uuid,
  enum as enumeration,
  literal,
  string,
  iso,
} from 'zod/mini';
import { ApiClient, ApiProblem } from '../../../core/api';
import type { UsersGateway } from '../models/users-gateway';
import type { InviteUser, UserCommand, UserFilters } from '../models/user';
import {
  mapUser,
  mapUserPage,
  mapAccess,
  mapAuditPage,
  mapOrganizationPage,
  reasonSchema,
  profileSchema,
  nameSchema,
} from '../mappers/users.mapper';
const reasonBody = strictObject({ reason: reasonSchema });
const inviteSchema = strictObject({
  ...profileSchema.shape,
  email: email(),
  name: nameSchema,
  lastName: nameSchema,
  reason: reasonSchema,
});
@Injectable()
export class HttpUsersGateway implements UsersGateway {
  private readonly api = inject(ApiClient);
  list(query: UserFilters) {
    return this.api.request('listUsers', { query }).pipe(map(mapUserPage));
  }
  get(userId: string) {
    return defer(() => {
      this.id(userId);
      return this.api
        .request('getUserAsAdministrator', { path: { userId } })
        .pipe(
          map((dto) => {
            const user = mapUser(dto);
            if (user.id !== userId) throw this.invalid();
            return user;
          }),
        );
    });
  }
  access(userId: string) {
    return defer(() => {
      this.id(userId);
      return this.api
        .request('getUserAccessAsAdministrator', { path: { userId } })
        .pipe(map((dto) => mapAccess(dto, userId)));
    });
  }
  audit(userId: string, page: number) {
    return defer(() => {
      this.id(userId);
      return this.api
        .request('listUserAuditAsAdministrator', {
          path: { userId },
          query: { page, limit: 20 },
        })
        .pipe(map((dto) => mapAuditPage(dto, userId)));
    });
  }
  organizations(search: string, page: number) {
    return this.api
      .request('listOrganizations', {
        query: { ...(search ? { search } : {}), page, limit: 20 },
      })
      .pipe(map(mapOrganizationPage));
  }
  invite(body: InviteUser) {
    return defer(() => {
      if (!inviteSchema.safeParse(body).success) throw this.input();
      return this.api
        .request('inviteUserAsAdministrator', { body })
        .pipe(map(mapUser));
    });
  }
  execute(command: UserCommand): Observable<void> {
    return defer(() => {
      const { userId, body } = command;
      this.id(userId);
      switch (command.kind) {
        case 'delete': {
          if (!reasonBody.safeParse(body).success) throw this.input();
          return this.api
            .request('deleteUserAsAdministrator', {
              path: { userId },
              body: command.body,
            })
            .pipe(map(() => undefined));
        }
        case 'profile': {
          if (
            !strictObject({
              profile: profileSchema,
              reason: reasonSchema,
            }).safeParse(body).success ||
            !Object.keys(command.body.profile).length
          )
            throw this.input();
          return this.api
            .request('updateUserAsAdministrator', {
              path: { userId },
              body: command.body,
            })
            .pipe(
              map((dto) => {
                if (mapUser(dto).id !== userId) throw this.invalid();
              }),
            );
        }
        case 'status': {
          if (
            !strictObject({
              status: enumeration(['active', 'disabled']),
              reason: reasonSchema,
            }).safeParse(body).success
          )
            throw this.input();
          return this.api
            .request('changeUserStatus', {
              path: { userId },
              body: command.body,
            })
            .pipe(
              map((dto) => {
                if (
                  !object({
                    id: literal(userId),
                    status: literal(command.body.status),
                    updatedAt: iso.datetime(),
                  }).safeParse(dto).success
                )
                  throw this.invalid();
              }),
            );
        }
        case 'role': {
          if (
            !strictObject({
              role: enumeration(['user', 'moderator', 'super_admin']),
              reason: reasonSchema,
            }).safeParse(body).success
          )
            throw this.input();
          return this.api
            .request('changeUserGlobalRole', {
              path: { userId },
              body: command.body,
            })
            .pipe(
              map((dto) => {
                if (
                  !object({
                    id: literal(userId),
                    globalRole: literal(command.body.role),
                    updatedAt: iso.datetime(),
                  }).safeParse(dto).success
                )
                  throw this.invalid();
              }),
            );
        }
        case 'resend': {
          if (!reasonBody.safeParse(body).success) throw this.input();
          return this.api
            .request('resendInvitationAsAdministrator', {
              path: { userId },
              body: command.body,
            })
            .pipe(
              map((dto) => {
                if (!object({ message: string() }).safeParse(dto).success)
                  throw this.invalid();
              }),
            );
        }
        case 'membership': {
          this.id(command.organizationId);
          if (
            !strictObject({
              role: enumeration([
                'business_admin',
                'business_operator',
                'adoption_admin',
                'adoption_operator',
              ]),
              reason: reasonSchema,
            }).safeParse(body).success
          )
            throw this.input();
          return this.api
            .request('assignOrganizationRole', {
              path: { userId, organizationId: command.organizationId },
              body: command.body,
            })
            .pipe(
              map((dto) => {
                if (
                  !object({
                    id: uuid(),
                    userId: literal(userId),
                    organizationId: literal(command.organizationId),
                    role: literal(command.body.role),
                    createdAt: iso.datetime(),
                    updatedAt: iso.datetime(),
                  }).safeParse(dto).success
                )
                  throw this.invalid();
              }),
            );
        }
        case 'remove-membership': {
          this.id(command.organizationId);
          if (!reasonBody.safeParse(body).success) throw this.input();
          return this.api
            .request('removeOrganizationRole', {
              path: { userId, organizationId: command.organizationId },
              body: command.body,
            })
            .pipe(
              map((dto) => {
                if (!object({ message: string() }).safeParse(dto).success)
                  throw this.invalid();
              }),
            );
        }
      }
    });
  }
  private id(value: string) {
    if (!uuid().safeParse(value).success) throw this.input();
  }
  private input() {
    return new ApiProblem(
      400,
      'INVALID_INPUT',
      'Revisa los campos del formulario antes de continuar.',
    );
  }
  private invalid() {
    return new ApiProblem(
      502,
      'INVALID_RESPONSE',
      'No pudimos validar la información recibida. Actualiza la página.',
    );
  }
}
