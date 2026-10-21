import { HttpErrorResponse } from '@angular/common/http';
import { object, string, optional, uuid } from 'zod/mini';
const responseSchema = object({
  code: string(),
  requestId: optional(uuid()),
});
export class ApiProblem extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiProblem';
  }
}
export function toApiProblem(error: unknown): ApiProblem {
  if (error instanceof ApiProblem) return error;
  if (!(error instanceof HttpErrorResponse))
    return new ApiProblem(
      0,
      'UNEXPECTED',
      'No pudimos completar la operación. Inténtalo nuevamente.',
    );
  const parsed = responseSchema.safeParse(error.error);
  const code = parsed.success ? parsed.data.code : 'HTTP_ERROR';
  const messages: Record<number, string> = {
    0: 'No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.',
    400: 'Revisa los datos enviados e inténtalo nuevamente.',
    401: 'El correo o la contraseña no son correctos, o tu sesión terminó.',
    403: 'No tienes acceso a esta operación. Tu cuenta debe estar activa y verificada.',
    404: 'No encontramos la información solicitada.',
    409: 'La información cambió. Actualiza la página antes de continuar.',
    429: 'Has realizado varios intentos. Espera un momento antes de volver a intentar.',
    503: 'El servicio no está disponible temporalmente. Inténtalo más tarde.',
  };
  const retry = Number(error.headers.get('Retry-After'));
  return new ApiProblem(
    error.status,
    code,
    messages[error.status] ??
      'No pudimos completar la operación. Inténtalo nuevamente.',
    parsed.success ? parsed.data.requestId : undefined,
    Number.isFinite(retry) && retry > 0 ? retry : undefined,
  );
}
