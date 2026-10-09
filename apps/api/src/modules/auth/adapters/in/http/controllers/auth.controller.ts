import { ZodSerializerDto } from 'nestjs-zod';
import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  AUTH_USE_CASES,
  type AuthUseCases,
} from '../../../../application/ports/in/auth-use-cases';
import {
  LogoutCommand,
  LogoutAllCommand,
} from '../../../../application/commands/auth.commands';
import type { AuthResult } from '../../../../application/results/auth-result';
import {
  CONFIG,
  type RuntimeConfig,
} from '../../../../../../shared/infrastructure/config';
import { ApplicationError } from '../../../../../../shared/domain/application-error';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import { RatePolicy } from '../../../../../../shared/infrastructure/http/security.guard';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import {
  RegisterRequestDto,
  LoginRequestDto,
  RefreshRequestDto,
  EmailRequestDto,
  ActionTokenRequestDto,
  ResetPasswordRequestDto,
} from '../dtos/requests/auth.requests';
import {
  AuthResponseDto,
  MessageResponseDto,
} from '../dtos/responses/auth.responses';
import { AuthHttpMapper } from '../mappers/auth-http.mapper';
import {
  REFRESH_COOKIE as COOKIE,
  refreshCookieOptions,
} from '../refresh-cookie';
@ApiTags('Authentication')
@DocumentErrors()
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_USE_CASES) private readonly auth: AuthUseCases,
    @Inject(CONFIG) private readonly settings: RuntimeConfig,
  ) {}
  private webRequest(request: Request) {
    if (
      request.get('X-CSRF-Protection') !== '1' ||
      !request.get('Origin') ||
      !this.settings.origins.includes(request.get('Origin') || '')
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Web cookie requests require an allowed Origin and X-CSRF-Protection: 1.',
      );
  }
  private cookieOptions() {
    return refreshCookieOptions(this.settings);
  }
  private response(result: AuthResult, mobile: boolean, response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    if (!mobile)
      response.cookie(COOKIE, result.refreshToken, {
        ...this.cookieOptions(),
        expires: result.refreshExpiresAt,
      });
    return AuthHttpMapper.response(result, mobile);
  }
  @Post('register')
  @HttpCode(202)
  @ZodSerializerDto(MessageResponseDto)
  @RatePolicy(5, 3600)
  @ApiOperation({
    operationId: 'register',
    summary: 'Register a client account',
    description:
      'Creates an unverified account and schedules a verification email. Verify the email before signing in.',
  })
  @ApiResponse({
    status: 202,
    type: MessageResponseDto,
    description: 'Account created; verification email scheduled.',
  })
  async register(@Body() dto: RegisterRequestDto) {
    await this.auth.register(AuthHttpMapper.register(dto));
    return {
      message: 'Account created. Check your email to verify your account.',
    };
  }
  @Post('login')
  @HttpCode(200)
  @RatePolicy(5, 60)
  @ApiHeader({
    name: 'X-CSRF-Protection',
    required: false,
    description:
      'Set to 1 for web clients. An allowed Origin is also required.',
  })
  @ApiOperation({
    operationId: 'login',
    summary: 'Sign in',
    description:
      'Requires verified email. Web clients receive an HttpOnly SameSite=Lax cookie; mobile clients receive refreshToken in JSON.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ZodSerializerDto(AuthResponseDto)
  async login(
    @Body() dto: LoginRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const mobile = dto.client === 'mobile';
    if (!mobile) this.webRequest(request);
    return this.response(
      await this.auth.login(AuthHttpMapper.login(dto)),
      mobile,
      response,
    );
  }
  @Post('refresh')
  @HttpCode(200)
  @RatePolicy(30, 60)
  @ApiCookieAuth('refreshCookie')
  @ApiHeader({
    name: 'X-CSRF-Protection',
    required: false,
    description:
      'Set to 1 with an allowed Origin when using the refresh cookie.',
  })
  @ApiOperation({
    operationId: 'refreshSession',
    summary: 'Rotate a refresh token',
    description:
      'Consumes the current refresh token and returns a new access token. Reusing a consumed token revokes its session. Session lifetime is absolute and is not extended.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ZodSerializerDto(AuthResponseDto)
  async refresh(
    @Body() dto: RefreshRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookie = request.cookies?.[COOKIE] as string | undefined;
    const mobile = Boolean(dto.refreshToken);
    if (cookie && mobile)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Use either a cookie or a body refresh token.',
      );
    if (!mobile) this.webRequest(request);
    const token = dto.refreshToken || cookie;
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new ApplicationError(
        'INVALID_TOKEN',
        'A valid refresh token is required.',
      );
    try {
      return this.response(
        await this.auth.refresh(AuthHttpMapper.refresh(token)),
        mobile,
        response,
      );
    } catch (error) {
      if (!mobile) response.clearCookie(COOKIE, this.cookieOptions());
      throw error;
    }
  }
  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    operationId: 'logout',
    summary: 'Revoke the current session',
    description:
      'Immediately invalidates its access and refresh tokens and clears the web refresh cookie.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ZodSerializerDto(MessageResponseDto)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(
      new LogoutCommand(request.principal.userId, request.principal.sessionId),
    );
    response.clearCookie(COOKIE, this.cookieOptions());
    return { message: 'Session revoked.' };
  }
  @Post('logout-all')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('accessToken')
  @ApiOperation({
    operationId: 'logoutAll',
    summary: 'Revoke all account sessions',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ZodSerializerDto(MessageResponseDto)
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logoutAll(new LogoutAllCommand(request.principal.userId));
    response.clearCookie(COOKIE, this.cookieOptions());
    return { message: 'All sessions revoked.' };
  }
  @Post('forgot-password')
  @HttpCode(202)
  @ZodSerializerDto(MessageResponseDto)
  @RatePolicy(3, 3600)
  @ApiOperation({
    operationId: 'forgotPassword',
    summary: 'Request password recovery',
    description:
      'Always returns the same acknowledgement whether an eligible account exists or not. The email link expires in 30 minutes by default.',
  })
  @ApiResponse({ status: 202, type: MessageResponseDto })
  async forgot(@Body() dto: EmailRequestDto) {
    await this.auth.forgotPassword(AuthHttpMapper.forgot(dto));
    return { message: 'If the account is eligible, an email will be sent.' };
  }
  @Post('resend-verification')
  @HttpCode(202)
  @ZodSerializerDto(MessageResponseDto)
  @RatePolicy(3, 3600)
  @ApiOperation({
    operationId: 'resendVerification',
    summary: 'Request another verification email',
    description:
      'Uniform acknowledgement. Replaces previous verification tokens for an eligible unverified account.',
  })
  @ApiResponse({ status: 202, type: MessageResponseDto })
  async resend(@Body() dto: EmailRequestDto) {
    await this.auth.resendVerification(AuthHttpMapper.resend(dto));
    return { message: 'If the account is eligible, an email will be sent.' };
  }
  @Post('verify-email')
  @HttpCode(200)
  @RatePolicy(10, 60)
  @ApiOperation({
    operationId: 'verifyEmail',
    summary: 'Verify the account email',
    description:
      'Consumes a single-use verification token. Verification links expire in 24 hours by default.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ZodSerializerDto(MessageResponseDto)
  async verify(@Body() dto: ActionTokenRequestDto) {
    await this.auth.verifyEmail(AuthHttpMapper.verify(dto));
    return { message: 'Email verified. You can now sign in.' };
  }
  @Post('reset-password')
  @HttpCode(200)
  @RatePolicy(5, 60)
  @ApiOperation({
    operationId: 'resetPassword',
    summary: 'Reset the account password',
    description:
      'Consumes a single-use reset token, updates the password and revokes all account sessions. Does not verify an unverified email.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ZodSerializerDto(MessageResponseDto)
  async reset(@Body() dto: ResetPasswordRequestDto) {
    await this.auth.resetPassword(AuthHttpMapper.reset(dto));
    return { message: 'Password reset. Sign in with your new password.' };
  }
}
