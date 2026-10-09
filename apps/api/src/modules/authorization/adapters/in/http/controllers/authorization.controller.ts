import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import {
  AUTHORIZATION,
  type Authorization,
} from '../../../../application/ports/in/authorization';
import {
  GetAccessQuery,
  GetUserAccessQuery,
} from '../../../../application/queries/get-access.query';
import {
  AccessResponseDto,
  RolesResponseDto,
} from '../dtos/responses/access.responses';
import { AccessUserParamsDto } from '../dtos/requests/access-user.params';
@ApiTags('Authorization')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('authorization')
export class AuthorizationController {
  constructor(
    @Inject(AUTHORIZATION) private readonly authorization: Authorization,
  ) {}
  @Get('roles')
  @ApiOperation({
    operationId: 'getRoleCatalog',
    summary: 'List the seven role definitions and permissions',
    description:
      'Available to authenticated accounts. Roles are fixed by the application policy; this endpoint does not grant access or permit customization. Only super_admin assigns global and organization roles. Permissions for future modules are capabilities reserved for their implementation.',
  })
  @ApiOkResponse({ type: RolesResponseDto })
  @ZodSerializerDto(RolesResponseDto)
  roles() {
    return { roles: this.authorization.roles() };
  }
  @Get('me')
  @ApiOperation({
    operationId: 'getCurrentUserAccess',
    summary: 'Get current global and organization access',
    description:
      'Reads current roles and memberships from PostgreSQL. Returns only the authenticated account access; permissions are advisory for rendering controls. Each backend operation still enforces permissions, organization/resource ownership and domain transitions. Global roles and organization memberships coexist. No role is trusted from client claims or JWT snapshots.',
  })
  @ApiOkResponse({ type: AccessResponseDto })
  @ZodSerializerDto(AccessResponseDto)
  get(@Req() req: AuthenticatedRequest) {
    return this.authorization.getAccess(
      new GetAccessQuery(req.principal.userId),
    );
  }
  @Get('users/:userId')
  @ApiOperation({
    operationId: 'getUserAccessAsAdministrator',
    summary: 'Inspect account roles as a super administrator',
    description:
      'Exclusive to current active verified super_admin. Returns configured global role and organization memberships for a target account, including disabled accounts, without contact/profile data. Configured permissions do not imply access for a disabled account. Returns 404 for unknown targets only after authorization.',
  })
  @ApiOkResponse({ type: AccessResponseDto })
  @ZodSerializerDto(AccessResponseDto)
  account(
    @Param() params: AccessUserParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.authorization.getUserAccess(
      new GetUserAccessQuery(req.principal.userId, params.userId),
    );
  }
}
