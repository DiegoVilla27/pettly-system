import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  RequestContext,
  RequestFilters,
  RequestDetail,
  RequestPage,
  RequestCommand,
} from './adoption-request';
export interface RequestsGateway {
  list(filters: RequestFilters): Observable<{
    publication: RequestDetail['publication'];
    page: RequestPage;
  }>;
  get(context: RequestContext): Observable<RequestDetail>;
  execute(command: RequestCommand): Observable<RequestDetail>;
}
export const REQUESTS_GATEWAY = new InjectionToken<RequestsGateway>(
  'REQUESTS_GATEWAY',
);
