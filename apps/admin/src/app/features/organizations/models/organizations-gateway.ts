import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Organization,
  OrganizationProfile,
  OrganizationFilters,
  OrganizationCommand,
  CreateOrganization,
  Page,
  Member,
  AuditEntry,
  AccountOption,
} from './organization';
export interface OrganizationsGateway {
  mine(query: OrganizationFilters): Observable<Page<Organization>>;
  basic(id: string): Observable<Organization>;
  list(query: OrganizationFilters): Observable<Page<Organization>>;
  get(organizationId: string): Observable<OrganizationProfile>;
  members(organizationId: string, page: number): Observable<Page<Member>>;
  audit(organizationId: string, page: number): Observable<Page<AuditEntry>>;
  accounts(search: string, page: number): Observable<Page<AccountOption>>;
  create(body: CreateOrganization): Observable<Organization>;
  execute(command: OrganizationCommand): Observable<OrganizationProfile>;
}
export const ORGANIZATIONS_GATEWAY = new InjectionToken<OrganizationsGateway>(
  'ORGANIZATIONS_GATEWAY',
);
