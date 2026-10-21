import {
  createZodDto,
  ZodValidationException,
  ZodSerializationException,
} from 'nestjs-zod';
import { z } from 'zod';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApplicationError,
  type ErrorCode,
} from '../../domain/application-error';
export const errorResponseSchema = z.strictObject({
  code: z.string().min(1).meta({
    description: 'Stable machine-readable error code.',
    example: 'INVALID_INPUT',
  }),
  message: z
    .string()
    .min(1)
    .meta({ description: 'Safe English error description.' }),
  requestId: z.uuid().meta({ description: 'Request identifier for support.' }),
  details: z
    .array(z.strictObject({ field: z.string(), message: z.string() }))
    .optional()
    .meta({
      description:
        'Safe request field validation errors. Submitted values are never included.',
    }),
});
export class ErrorResponseDto extends createZodDto(errorResponseSchema) {}
export const DocumentErrors = () =>
  applyDecorators(
    ...[400, 401, 403, 404, 409, 429, 500, 503].map((status) =>
      ApiResponse({
        status,
        type: ErrorResponseDto,
        description: (
          {
            400: 'Invalid request or action token.',
            401: 'Missing, expired or revoked authentication.',
            403: 'Email verification or the required authorization is missing.',
            404: 'Resource was not found.',
            409: 'The operation conflicts with a resource or authorization invariant.',
            429: 'Rate limit exceeded. Retry-After specifies seconds to wait.',
            500: 'An unexpected internal error occurred. Use requestId for support.',
            503: 'A required dependency is unavailable.',
          } as Record<number, string>
        )[status],
      }),
    ),
  );
const statusByCode: Record<ErrorCode, number> = {
  FORBIDDEN: 403,
  CONFLICT: 409,
  INVALID_INPUT: 400,
  EMAIL_TAKEN: 409,
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_VERIFIED: 403,
  INVALID_TOKEN: 400,
  UNAUTHENTICATED: 401,
  USER_NOT_FOUND: 404,
  RESOURCE_NOT_FOUND: 404,
  RATE_LIMITED: 429,
  DEPENDENCY_UNAVAILABLE: 503,
};
@Catch()
export class HttpErrorsFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorsFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp(),
      request = http.getRequest<Request & { requestId: string }>(),
      response = http.getResponse<Response>();
    let status = 500,
      code = 'INTERNAL_ERROR',
      message = 'An unexpected error occurred.';
    let details: { field: string; message: string }[] | undefined;
    if (error instanceof ZodSerializationException) {
      this.logger.error(`Invalid response contract: ${request.requestId}`);
    } else if (error instanceof ZodValidationException) {
      status = 400;
      code = 'INVALID_INPUT';
      message = 'The request contains invalid or unexpected fields.';
      const validation = error.getZodError();
      if (validation instanceof z.ZodError)
        details = validation.issues.map((issue) => ({
          field: issue.path.map(String).join('.'),
          message: issue.message,
        }));
    } else if (error instanceof ApplicationError) {
      status = statusByCode[error.code];
      code = error.code;
      message = error.message;
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      code = status === 400 ? 'INVALID_INPUT' : `HTTP_${status}`;
      message =
        status === 400
          ? 'The request contains invalid or unexpected fields.'
          : error.message;
    } else this.logger.error(`Unhandled request failure: ${request.requestId}`);
    response.status(status).json(
      errorResponseSchema.parse({
        code,
        message,
        requestId: request.requestId,
        ...(details ? { details } : {}),
      }),
    );
  }
}
