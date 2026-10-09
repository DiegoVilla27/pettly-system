import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import {
  USERS_DIRECTORY,
  type UsersDirectory,
} from '../users/application/ports/out/users-directory';
import {
  ORGANIZATION_ACCESS,
  type OrganizationAccess,
} from '../organizations/application/ports/in/organization-access';
import { AUTHORIZATION } from './application/ports/in/authorization';
import { AccessHandler } from './application/handlers/access.handler';
import { AuthorizationController } from './adapters/in/http/controllers/authorization.controller';
@Module({
  imports: [UsersModule, OrganizationsModule],
  controllers: [AuthorizationController],
  providers: [
    {
      provide: AUTHORIZATION,
      useFactory: (users: UsersDirectory, organizations: OrganizationAccess) =>
        new AccessHandler(users, organizations),
      inject: [USERS_DIRECTORY, ORGANIZATION_ACCESS],
    },
  ],
  exports: [AUTHORIZATION],
})
export class AuthorizationModule {}
