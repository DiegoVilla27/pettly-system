import type { ApiRequest, ApiResponse } from '@pettly/api-client';
import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
export type Policy = NonNullable<ApiResponse<'getCommercialPolicy'>['policy']>;
export type PolicyRequest = ApiRequest<'configureCommercialPolicy'>;
export type Audit = ApiResponse<'listCommercialPolicyAudits'>;
export interface Company {
  id: string;
  name: string;
}
export interface VariantOption {
  id: string;
  name: string;
}
export interface VariantPage {
  items: VariantOption[];
  candidateTotal: number;
  page: number;
  limit: number;
}
export interface CommercialGateway {
  companies(search: string, currentId?: string): Observable<Company[]>;
  get(id: string): Observable<Policy | null>;
  audit(id: string, page: number): Observable<Audit>;
  variants(id: string, page: number, search: string): Observable<VariantPage>;
  save(id: string, body: PolicyRequest): Observable<Policy>;
}
export const COMMERCIAL_GATEWAY = new InjectionToken<CommercialGateway>(
  'COMMERCIAL_GATEWAY',
);
