import {
  ACCOUNT_ADMINISTRATION,
  type AccountAdministration,
} from '../../../../../auth/application/ports/in/account-administration';
import { ListUserAuditQuery } from '../../../../application/queries/list-user-audit.query';
import { PaginationRequestDto } from '../../../../../../shared/infrastructure/http/pagination.schemas';
import { UserAuditPageResponseDto } from '../dtos/responses/user-audit-page.response';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
class AdministrationMessageResponseDto extends createZodDto(
  z.strictObject({ message: z.string() }),
) {}
import { ListUsersQuery } from '../../../../application/queries/list-users.query';
import { GetUserQuery } from '../../../../application/queries/get-user.query';
import { AdminUpdateProfileCommand } from '../../../../application/commands/admin-update-profile.command';
import {
  ListUsersRequestDto,
  AdminUpdateUserRequestDto,
  InviteUserRequestDto,
  DeleteUserRequestDto,
  ResendInvitationRequestDto,
} from '../dtos/requests/admin-users.requests';
import { UserPageResponseDto } from '../dtos/responses/user-page.response';
import {
  Body,
  Delete,
  Post,
  HttpCode,
  Controller,
  Get,
  Query,
  Inject,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  USERS_USE_CASES,
  type UsersUseCases,
} from '../../../../application/ports/in/users-use-cases';
import { GetProfileQuery } from '../../../../application/queries/get-profile.query';
import { UpdateProfileCommand } from '../../../../application/commands/update-profile.command';
import { ChangeUserStatusCommand } from '../../../../application/commands/change-user-status.command';
import { ChangeUserRoleCommand } from '../../../../application/commands/change-user-role.command';
import { ChangeUserRoleRequestDto } from '../dtos/requests/change-user-role.request';
import { UserRoleResponseDto } from '../dtos/responses/user-role.response';
import {
  CLOCK,
  type Clock,
} from '../../../../../../shared/application/runtime-ports';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import { UserResponseDto } from '../dtos/responses/user.response';
import { UserStatusResponseDto } from '../dtos/responses/user-status.response';
import { UpdateProfileRequestDto } from '../dtos/requests/update-profile.request';
import {
  ChangeUserStatusRequestDto,
  UserIdParamsDto,
} from '../dtos/requests/change-user-status.request';
import { UserHttpMapper } from '../mappers/user-http.mapper';
@ApiTags('Users')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    @Inject(USERS_USE_CASES) private readonly users: UsersUseCases,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ACCOUNT_ADMINISTRATION)
    private readonly accounts: AccountAdministration,
  ) {}
  @Post()
  @HttpCode(202)
  @ApiOperation({
    operationId: 'inviteUserAsAdministrator',
    summary: 'Create an account through an email invitation',
    description:
      'Only a current active verified super_admin may create an account. Body contains profile, email and mandatory reason, never a password or role. Creates an unverified user account with globalRole user and sends a 24-hour invitation to choose its own password. No credentials are returned. Creation, encrypted outbox and audit are atomic.',
  })
  @ApiResponse({ status: 202, type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  async invite(
    @Body() dto: InviteUserRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { email, reason, ...profile } = dto;
    return UserHttpMapper.response(
      await this.accounts.invite({
        actorId: request.principal.userId,
        email,
        profile,
        reason,
        requestId: request.requestId,
      }),
      this.clock.now(),
    );
  }
  @Post(':userId/invitation')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'resendInvitationAsAdministrator',
    summary: 'Resend a pending account invitation',
    description:
      'Requires current active verified super_admin and a reason. Only active unverified invited accounts without credentials qualify. Invalidates the previous invitation and sends a new 24-hour link. Delivery failure rolls back token replacement and audit.',
  })
  @ApiOkResponse({ type: AdministrationMessageResponseDto })
  @ZodSerializerDto(AdministrationMessageResponseDto)
  async resend(
    @Param() params: UserIdParamsDto,
    @Body() dto: ResendInvitationRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.accounts.resendInvitation({
      actorId: request.principal.userId,
      userId: params.userId,
      reason: dto.reason,
      requestId: request.requestId,
    });
    return { message: 'Invitation scheduled.' };
  }
  @Delete(':userId')
  @ApiOperation({
    operationId: 'deleteUserAsAdministrator',
    summary: 'Delete and anonymize an account as a super administrator',
    description:
      'Requires current active verified super_admin and a mandatory reason. Removes personal profile and credentials, erases action/refresh tokens and revokes all sessions atomically with immutable audit. Preserves UUID historical references. Deleted accounts cannot be edited or reactivated. Repeating deletion is a no-op. The last active verified superadministrator is protected.',
  })
  @ApiOkResponse({ type: AdministrationMessageResponseDto })
  @ZodSerializerDto(AdministrationMessageResponseDto)
  async remove(
    @Param() params: UserIdParamsDto,
    @Body() dto: DeleteUserRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.accounts.remove({
      actorId: request.principal.userId,
      userId: params.userId,
      reason: dto.reason,
      requestId: request.requestId,
      administrative: true,
    });
    return { message: 'Account deleted.' };
  }
  @Get(':userId/audit')
  @ApiOperation({
    operationId: 'listUserAuditAsAdministrator',
    summary: 'Read the immutable administration audit for an account',
    description:
      'Requires current active verified super_admin. Paginated newest-first with UUID tie-breaker; page size 1–100. Includes actor, target, action, reason, request UUID and time; never includes passwords, tokens or historical profile values. Remains available after account deletion.',
  })
  @ApiOkResponse({ type: UserAuditPageResponseDto })
  @ZodSerializerDto(UserAuditPageResponseDto)
  async audit(
    @Param() params: UserIdParamsDto,
    @Query() dto: PaginationRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const page = await this.users.listAudit(
      new ListUserAuditQuery(
        request.principal.userId,
        params.userId,
        dto.page,
        dto.limit,
      ),
    );
    return {
      ...page,
      items: page.items.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }
  @Get()
  @ApiOperation({
    operationId: 'listUsers',
    summary: 'Search and paginate accounts as a super administrator',
    description:
      'Requires current active verified super_admin. Search matches email, given name or surname without case sensitivity. Filters include status, global role, organization role and verification. Limit is 1–100; sorting is allowlisted with a UUID tie-breaker. Credentials, tokens and MFA secrets are never returned. Deleted accounts contain anonymized identity only.',
  })
  @ApiOkResponse({ type: UserPageResponseDto })
  @ZodSerializerDto(UserPageResponseDto)
  async list(
    @Query() dto: ListUsersRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const page = await this.users.list(
      new ListUsersQuery(
        request.principal.userId,
        dto.page,
        dto.limit,
        dto.search,
        dto.status,
        dto.role,
        dto.organizationRole,
        dto.emailVerified,
        dto.sortBy,
        dto.sortOrder,
      ),
    );
    return {
      ...page,
      items: page.items.map((user) =>
        UserHttpMapper.response(user, this.clock.now()),
      ),
    };
  }
  @Get('me')
  @ApiOperation({
    operationId: 'getCurrentUser',
    summary: 'Get the authenticated user profile',
    description:
      'Returns the account profile and global role for the authenticated account only. Age is computed from dateOfBirth in UTC. Credentials and authentication tokens are never included.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  async get(@Req() request: AuthenticatedRequest) {
    return UserHttpMapper.response(
      await this.users.getProfile(
        new GetProfileQuery(request.principal.userId),
      ),
      this.clock.now(),
    );
  }
  @Patch('me')
  @ApiOperation({
    operationId: 'updateCurrentUser',
    summary: 'Update the authenticated user profile',
    description:
      'Partial update: omit fields to preserve them; send null to clear optional contact/address/birth-date fields. Given name and family name cannot be cleared. Empty updates and unknown fields are rejected. Email, age, status and globalRole are read-only here.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  async update(
    @Body() dto: UpdateProfileRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return UserHttpMapper.response(
      await this.users.updateProfile(
        new UpdateProfileCommand(request.principal.userId, dto),
      ),
      this.clock.now(),
    );
  }
  @Patch(':userId/role')
  @ApiOperation({
    operationId: 'changeUserGlobalRole',
    summary: 'Assign a global role as a super administrator',
    description:
      'Only a current active verified super_admin may assign user, moderator or super_admin. The target must be active and verified. Organization roles use the membership endpoint. Changes atomically revoke all target sessions and append an audit reason. Repeating the current role is a no-op. The last active superadministrator cannot be demoted. After a change the target must sign in again.',
  })
  @ApiOkResponse({ type: UserRoleResponseDto })
  @ZodSerializerDto(UserRoleResponseDto)
  async role(
    @Param() params: UserIdParamsDto,
    @Body() dto: ChangeUserRoleRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const user = await this.users.changeRole(
      new ChangeUserRoleCommand(
        request.principal.userId,
        params.userId,
        dto.role,
        dto.reason,
        request.requestId,
      ),
    );
    return {
      id: user.id,
      globalRole: user.globalRole,
      updatedAt: user.updatedAt.toISOString(),
    };
  }
  @Patch(':userId/status')
  @ApiOperation({
    operationId: 'changeUserStatus',
    summary: 'Change an account status as a super administrator',
    description:
      'Requires a currently active, verified super_admin account. The role is read from PostgreSQL, never trusted from request fields or stale JWT claims. A state transition atomically updates the account, revokes all sessions when disabling, and records actor, target, reason and request id in the audit trail. Reactivation does not restore revoked sessions or verify email. Repeating the current state is a no-op. Disabling the last active super administrator returns 409.',
  })
  @ApiOkResponse({
    type: UserStatusResponseDto,
    description:
      'Resulting account state. No private profile fields are exposed.',
  })
  @ZodSerializerDto(UserStatusResponseDto)
  async status(
    @Param() params: UserIdParamsDto,
    @Body() dto: ChangeUserStatusRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const user = await this.users.changeStatus(
      new ChangeUserStatusCommand(
        request.principal.userId,
        params.userId,
        dto.status,
        dto.reason,
        request.requestId,
      ),
    );
    return {
      id: user.id,
      status: user.status,
      updatedAt: user.updatedAt.toISOString(),
    };
  }
  @Get(':userId')
  @ApiOperation({
    operationId: 'getUserAsAdministrator',
    summary: 'Read an account as a super administrator',
    description:
      'Requires current active verified super_admin. Returns profile, status and global role for the selected UUID, including inactive and anonymized accounts. No authentication secrets are exposed. Other actors are denied before target discovery.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  async detail(
    @Param() params: UserIdParamsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return UserHttpMapper.response(
      await this.users.getUser(
        new GetUserQuery(request.principal.userId, params.userId),
      ),
      this.clock.now(),
    );
  }
  @Patch(':userId')
  @ApiOperation({
    operationId: 'updateUserAsAdministrator',
    summary: 'Update an account profile as a super administrator',
    description:
      'Body contains profile and mandatory audit reason. Active or disabled accounts may be updated; deleted accounts cannot be restored or edited. Email, password, verification, status and roles are not writable here: use their explicit security workflows. The update and immutable audit event commit atomically.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  async adminUpdate(
    @Param() params: UserIdParamsDto,
    @Body() dto: AdminUpdateUserRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return UserHttpMapper.response(
      await this.users.adminUpdateProfile(
        new AdminUpdateProfileCommand(
          request.principal.userId,
          params.userId,
          dto.profile,
          dto.reason,
          request.requestId,
        ),
      ),
      this.clock.now(),
    );
  }
}
