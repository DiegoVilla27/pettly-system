import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Option,
  OptionsPage,
  PreparationCommand,
  Credential,
  CredentialFilters,
  CredentialCommand,
  CredentialAudit,
  Page,
} from './credential';
export interface VeterinaryGateway {
  companies(search: string): Observable<Option[]>;
  professionals(organizationId: string, page: number): Observable<OptionsPage>;
  resources(organizationId: string, page: number): Observable<OptionsPage>;
  mine(filters: CredentialFilters): Observable<Page<Credential>>;
  prepare(command: PreparationCommand): Observable<Credential>;
  professional(userId: string): Observable<{ id: string; fullName: string }>;
  list(filters: CredentialFilters): Observable<Page<Credential>>;
  get(credentialId: string): Observable<Credential>;
  audit(credentialId: string, page: number): Observable<Page<CredentialAudit>>;
  evidence(credentialId: string, mediaId: string): Observable<Blob>;
  execute(command: CredentialCommand): Observable<Credential>;
}
export const VETERINARY_GATEWAY = new InjectionToken<VeterinaryGateway>(
  'VETERINARY_GATEWAY',
);
