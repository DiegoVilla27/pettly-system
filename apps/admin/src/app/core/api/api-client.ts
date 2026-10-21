import {
  HttpClient,
  HttpContext,
  HttpContextToken,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, throwError, type Observable } from 'rxjs';
import {
  operationRoutes,
  type ApiRequest,
  type ApiPath,
  type ApiQuery,
  type ApiResponse,
  type OperationId,
  type ApiImageOperationId,
  type ApiMultipartOperationId,
  type ApiMultipart,
} from '@pettly/api-client';
import { API_BASE_URL } from './api.config';
import { toApiProblem } from './api-problem';
type ApiOptions<K extends OperationId> = {
  body?: ApiRequest<K>;
  bearer?: string;
  sessionManaged?: boolean;
  query?: ApiQuery<K>;
} & ([ApiPath<K>] extends [never] ? { path?: never } : { path: ApiPath<K> });
export const SESSION_MANAGED = new HttpContextToken(() => false);
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  /** Private image bytes use the same session interceptor and encoded API paths. */
  image<K extends ApiImageOperationId>(
    operation: K,
    path: ApiPath<K>,
  ): Observable<Blob> {
    const route = operationRoutes[operation];
    const url = route.path.replace(/\{(\w+)\}/g, (_, key: string) => {
      const value = (path as Record<string, string>)[key];
      if (!value) throw Error('A typed path parameter is required.');
      return encodeURIComponent(value);
    });
    return this.http
      .get(this.base + url, {
        responseType: 'blob',
        withCredentials: true,
        timeout: 15000,
        headers: new HttpHeaders({ 'X-CSRF-Protection': '1' }),
        context: new HttpContext().set(SESSION_MANAGED, false),
      })
      .pipe(catchError((error) => throwError(() => toApiProblem(error))));
  }
  upload<K extends ApiMultipartOperationId>(
    operation: K,
    path: ApiPath<K>,
    body: ApiMultipart<K>,
  ): Observable<ApiResponse<K>> {
    const route = operationRoutes[operation];
    const url = route.path.replace(/\{(\w+)\}/g, (_, key: string) => {
      const value = (path as Record<string, string>)[key];
      if (!value) throw Error('A typed path parameter is required.');
      return encodeURIComponent(value);
    });
    const form = new FormData();
    for (const [key, value] of Object.entries(body)) {
      if (value instanceof Blob) form.append(key, value, 'photo');
      else form.append(key, String(value));
    }
    return this.http
      .request<ApiResponse<K>>(route.method, this.base + url, {
        body: form,
        withCredentials: true,
        timeout: 15000,
        headers: new HttpHeaders({ 'X-CSRF-Protection': '1' }),
        context: new HttpContext().set(SESSION_MANAGED, false),
      })
      .pipe(catchError((error) => throwError(() => toApiProblem(error))));
  }
  request<K extends OperationId>(
    operation: K,
    ...args: [ApiPath<K>] extends [never]
      ? [options?: ApiOptions<K>]
      : [options: ApiOptions<K>]
  ): Observable<ApiResponse<K>> {
    const options = (args[0] ?? {}) as ApiOptions<K>;
    const route = operationRoutes[operation];
    const path = route.path.replace(/\{(\w+)\}/g, (_, key: string) => {
      const value = (options.path as Record<string, string> | undefined)?.[key];
      if (typeof value !== 'string' || !value)
        throw Error('A typed path parameter is required.');
      return encodeURIComponent(value);
    });
    let params = new HttpParams();
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) params = params.set(key, String(value));
    }
    let headers = new HttpHeaders({ 'X-CSRF-Protection': '1' });
    if (options.bearer)
      headers = headers.set('Authorization', `Bearer ${options.bearer}`);
    return this.http
      .request<ApiResponse<K>>(route.method, this.base + path, {
        body: options.body,
        params,
        headers,
        withCredentials: true,
        timeout: 15000,
        context: new HttpContext().set(
          SESSION_MANAGED,
          options.sessionManaged ?? !route.authenticated,
        ),
      })
      .pipe(catchError((error) => throwError(() => toApiProblem(error))));
  }
}
