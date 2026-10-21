import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  ProfessionalPage,
  Company,
  Service,
  ServicePage,
  ServiceQuery,
  ServiceContext,
  ServiceCommand,
  Resource,
  Audit,
} from './service';
export interface ServicesGateway {
  companies(search: string, currentId?: string): Observable<Company[]>;
  list(
    query: ServiceQuery | { page: number; limit: number },
    review: boolean,
  ): Observable<ServicePage>;
  get(context: ServiceContext): Observable<Service>;
  eligible(organizationId: string, page: number): Observable<ProfessionalPage>;
  resources(organizationId: string): Observable<Resource[]>;
  audit(
    context: ServiceContext,
    page: number,
  ): Observable<{ items: Audit[]; total: number }>;
  execute(command: ServiceCommand): Observable<Service>;
}
export const SERVICES_GATEWAY = new InjectionToken<ServicesGateway>(
  'SERVICES_GATEWAY',
);
