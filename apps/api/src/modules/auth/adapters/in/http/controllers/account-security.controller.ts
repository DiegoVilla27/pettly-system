import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import type { Response } from 'express';
import {
  AUTH_USE_CASES,
  type AuthUseCases,
} from '../../../../application/ports/in/auth-use-cases';
import {
  ChangePasswordCommand,
  ChangeEmailCommand,
  ConfirmEmailChangeCommand,
  AcceptInvitationCommand,
  RevokeSessionCommand,
} from '../../../../application/commands/account-security.commands';
import { ListSessionsQuery } from '../../../../application/queries/list-sessions.query';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import {
  CONFIG,
  type RuntimeConfig,
} from '../../../../../../shared/infrastructure/config';
import { PaginationRequestDto } from '../../../../../../shared/infrastructure/http/pagination.schemas';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import { RatePolicy } from '../../../../../../shared/infrastructure/http/security.guard';
import {
  ChangePasswordRequestDto,
  ChangeEmailRequestDto,
  AcceptInvitationRequestDto,
  DeleteAccountRequestDto,
  SessionIdParamsDto,
} from '../dtos/requests/account-security.requests';
import { ActionTokenRequestDto } from '../dtos/requests/auth.requests';
import { MessageResponseDto } from '../dtos/responses/auth.responses';
import { SessionPageResponseDto } from '../dtos/responses/session-page.response';
import { REFRESH_COOKIE, refreshCookieOptions } from '../refresh-cookie';
@ApiTags('Account security')
@DocumentErrors()
@Controller('auth')
export class AccountSecurityController {
  constructor(
    @Inject(AUTH_USE_CASES) private readonly auth: AuthUseCases,
    @Inject(CONFIG) private readonly settings: RuntimeConfig,
  ) {}
  @Post('accept-invitation')
  @HttpCode(200)
  @RatePolicy(5, 60)
  @ApiOperation({
    operationId: 'acceptInvitation',
    summary: 'Accept an invited account',
    description:
      'Consumes a single-use 24-hour invitation token, chooses an Argon2id password and verifies the recipient email. Does not issue a session or assign roles. Sign in separately. Expired invitations can be resent by a super administrator.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ZodSerializerDto(MessageResponseDto)
  async accept(@Body() dto: AcceptInvitationRequestDto) {
    await this.auth.acceptInvitation(
      new AcceptInvitationCommand(dto.token, dto.password),
    );
    return { message: 'Invitation accepted. You can now sign in.' };
  }
  @Post('change-password')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('accessToken')
  @RatePolicy(5, 60)
  @ApiOperation({
    operationId: 'changePassword',
    summary: 'Change the authenticated account password',
    description:
      'Requires the current password and a different new password of 12–128 characters. Atomically changes credentials, invalidates all action tokens and pending email changes, revokes every session and schedules a security notice. Clears the web refresh cookie. Sign in again.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ZodSerializerDto(MessageResponseDto)
  async password(
    @Body() dto: ChangePasswordRequestDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.changePassword(
      new ChangePasswordCommand(
        request.principal.userId,
        request.principal.sessionId,
        dto.currentPassword,
        dto.newPassword,
      ),
    );
    response.clearCookie(REFRESH_COOKIE, refreshCookieOptions(this.settings));
    return { message: 'Password changed. Sign in again.' };
  }
  @Post('change-email')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('accessToken')
  @RatePolicy(3, 3600)
  @ApiOperation({
    operationId: 'requestEmailChange',
    summary: 'Request a verified change of account email',
    description:
      'Requires current password. Keeps the current email until a single-use 30-minute link sent to the new address is confirmed. Supersedes previous email-change tokens and notifies the current address. New address must be available; this request does not reserve it.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ZodSerializerDto(MessageResponseDto)
  async email(
    @Body() dto: ChangeEmailRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.auth.changeEmail(
      new ChangeEmailCommand(
        request.principal.userId,
        request.principal.sessionId,
        dto.password,
        dto.email,
      ),
    );
    return { message: 'Check your new email address to confirm the change.' };
  }
  @Post('confirm-email-change')
  @HttpCode(200)
  @RatePolicy(5, 60)
  @ApiOperation({
    operationId: 'confirmEmailChange',
    summary: 'Confirm a new account email',
    description:
      'Consumes the email-change token and rechecks address availability. Atomically sets the verified new email, invalidates action tokens, clears the pending address and revokes every session. Sends security notices to both addresses. A password change/reset invalidates this link.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ZodSerializerDto(MessageResponseDto)
  async confirm(
    @Body() dto: ActionTokenRequestDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.confirmEmailChange(
      new ConfirmEmailChangeCommand(dto.token),
    );
    response.clearCookie(REFRESH_COOKIE, refreshCookieOptions(this.settings));
    return { message: 'Email changed. Sign in with your new address.' };
  }
  @Get('sessions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('accessToken')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listOwnSessions',
    summary: 'List active sessions owned by the current account',
    description:
      'Paginated newest-first with a UUID tie-breaker. Includes only unexpired, unrevoked sessions and identifies the current session. Never exposes access tokens, refresh hashes or another account sessions. Page size is 1–100.',
  })
  @ApiOkResponse({ type: SessionPageResponseDto })
  @ZodSerializerDto(SessionPageResponseDto)
  async sessions(
    @Query() dto: PaginationRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const page = await this.auth.listSessions(
      new ListSessionsQuery(
        request.principal.userId,
        request.principal.sessionId,
        dto.page,
        dto.limit,
      ),
    );
    return {
      ...page,
      items: page.items.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        current: s.current,
      })),
    };
  }
  @Delete('sessions/:sessionId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    operationId: 'revokeOwnSession',
    summary: 'Revoke a selected owned session',
    description:
      'Immediately invalidates its access and refresh tokens. Other accounts session UUIDs return 404. Already revoked owned sessions are a no-op. Revoking the current session also clears the web refresh cookie.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ZodSerializerDto(MessageResponseDto)
  async revoke(
    @Param() params: SessionIdParamsDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.revokeSession(
      new RevokeSessionCommand(request.principal.userId, params.sessionId),
    );
    if (params.sessionId === request.principal.sessionId)
      response.clearCookie(REFRESH_COOKIE, refreshCookieOptions(this.settings));
    return { message: 'Session revoked.' };
  }
  @Delete('account')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('accessToken')
  @RatePolicy(5, 60)
  @ApiOperation({
    operationId: 'deleteOwnAccount',
    summary: 'Delete and anonymize the current account',
    description:
      'Requires current password and reason. Permanently anonymizes profile, clears credentials/action/refresh tokens, revokes all sessions and writes immutable audit in one transaction. Historical UUID references remain. The last active verified superadministrator cannot be deleted. Deleted accounts cannot be restored.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ZodSerializerDto(MessageResponseDto)
  async remove(
    @Body() dto: DeleteAccountRequestDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.remove({
      actorId: request.principal.userId,
      userId: request.principal.userId,
      password: dto.password,
      reason: dto.reason,
      requestId: request.requestId,
      administrative: false,
    });
    response.clearCookie(REFRESH_COOKIE, refreshCookieOptions(this.settings));
    return { message: 'Account deleted.' };
  }
}
