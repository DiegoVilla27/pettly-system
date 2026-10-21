import {
  HttpErrorResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../api/api.config';
import { SESSION_MANAGED } from '../../api/api-client';
import { toApiProblem } from '../../api/api-problem';
import { SessionService } from './session.service';
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const base = inject(API_BASE_URL);
  if (
    !request.url.startsWith(base + '/') ||
    request.context.get(SESSION_MANAGED)
  )
    return next(request);
  const session = inject(SessionService);
  const authenticated = (token: string) =>
    request.clone({
      withCredentials: true,
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'X-CSRF-Protection': '1',
      },
    });
  return from(session.accessToken()).pipe(
    switchMap((token) =>
      next(authenticated(token)).pipe(
        catchError((error) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401)
            return throwError(() => error);
          // Concurrent 401 responses reuse a token already rotated by another request.
          const newer = session.currentToken();
          const recovery =
            newer && newer !== token
              ? Promise.resolve(newer)
              : session.refreshAccess();
          return from(recovery).pipe(
            switchMap((fresh) => next(authenticated(fresh))),
            catchError((failure) => {
              const problem = toApiProblem(failure);
              if (
                [400, 401, 403].includes(problem.status) &&
                problem.code !== 'STALE_SESSION'
              )
                session.expire();
              return throwError(() => problem);
            }),
          );
        }),
      ),
    ),
    catchError((error) => {
      const problem = toApiProblem(error);
      if (
        [400, 401].includes(problem.status) &&
        problem.code === 'INVALID_TOKEN'
      )
        session.expire();
      return throwError(() => problem);
    }),
  );
};
