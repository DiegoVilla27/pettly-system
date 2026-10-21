import {
  RegisterCommand,
  LoginCommand,
  RefreshCommand,
  ForgotPasswordCommand,
  ResendVerificationCommand,
  VerifyEmailCommand,
  ResetPasswordCommand,
} from '../../../../application/commands/auth.commands';
import type { AuthResult } from '../../../../application/results/auth-result';
import type {
  RegisterRequestDto,
  LoginRequestDto,
  EmailRequestDto,
  ActionTokenRequestDto,
  ResetPasswordRequestDto,
} from '../dtos/requests/auth.requests';
import { AuthResponseDto } from '../dtos/responses/auth.responses';
export class AuthHttpMapper {
  static register(dto: RegisterRequestDto) {
    const { email, password, ...profile } = dto;
    return new RegisterCommand(email, profile, password);
  }
  static login(dto: LoginRequestDto) {
    return new LoginCommand(dto.email, dto.password);
  }
  static refresh(token: string) {
    return new RefreshCommand(token);
  }
  static forgot(dto: EmailRequestDto) {
    return new ForgotPasswordCommand(dto.email);
  }
  static resend(dto: EmailRequestDto) {
    return new ResendVerificationCommand(dto.email);
  }
  static verify(dto: ActionTokenRequestDto) {
    return new VerifyEmailCommand(dto.token);
  }
  static reset(dto: ResetPasswordRequestDto) {
    return new ResetPasswordCommand(dto.token, dto.password);
  }
  static response(result: AuthResult, mobile: boolean): AuthResponseDto {
    return Object.assign(new AuthResponseDto(), {
      accessToken: result.accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: result.expiresIn,
      sessionId: result.sessionId,
      ...(mobile ? { refreshToken: result.refreshToken } : {}),
    });
  }
}
