import type { ApiRequest, ApiResponse, ApiQuery } from '@pettly/api-client';
export type CredentialDto = ApiResponse<'getVeterinaryCredential'>;
export type Credential = CredentialDto & {
  statusLabel: string;
  professionLabel: string;
};
export type CredentialFilters = ApiQuery<'listVeterinaryCredentials'>;
export type CredentialAudit =
  ApiResponse<'listVeterinaryCredentialAudit'>['items'][number] & {
    actionLabel: string;
    snapshot: Credential;
  };
export type ReviewRequest = ApiRequest<'reviewVeterinaryCredential'>;
export type RevokeRequest = ApiRequest<'revokeVeterinaryCredential'>;
export type CredentialCommand =
  | { kind: 'review'; credentialId: string; body: ReviewRequest }
  | { kind: 'revoke'; credentialId: string; body: RevokeRequest };
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export const statuses = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'revoked', label: 'Revocada' },
] as const;
export const documentKinds = [
  { value: 'professional_card', label: 'Tarjeta profesional' },
  { value: 'qualification', label: 'Título profesional' },
  { value: 'standing_certificate', label: 'Certificado de vigencia' },
] as const;
export const defaultFilters: CredentialFilters = { page: 1, limit: 20 };
export interface Evidence {
  credentialId: string;
  mediaId: string;
  kindLabel: string;
  blob: Blob;
}

export type CreateCredential = ApiRequest<'createVeterinaryCredential'>;
export type ConfigureCredential = ApiRequest<'configureVeterinaryCredential'>;
export type PreparationCommand =
  | { kind: 'create'; body: CreateCredential }
  | { kind: 'configure'; credentialId: string; body: ConfigureCredential }
  | {
      kind: 'submit';
      credentialId: string;
      body: ApiRequest<'submitVeterinaryCredential'>;
    }
  | {
      kind: 'upload';
      credentialId: string;
      body: {
        file: File;
        kind: CredentialDto['documents'][number]['kind'];
        reason: string;
        expectedVersion: number;
      };
    }
  | {
      kind: 'remove';
      credentialId: string;
      mediaId: string;
      body: ApiRequest<'removeVeterinaryEvidence'>;
    };
export interface Option {
  id: string;
  name: string;
}
export interface OptionsPage {
  items: Option[];
  total: number;
  page: number;
  limit: number;
}
