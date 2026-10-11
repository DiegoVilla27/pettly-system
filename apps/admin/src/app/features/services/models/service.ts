import type { ApiRequest, ApiResponse, ApiQuery } from '@pettly/api-client';
export type Service = ApiResponse<'getManagedService'>;
export type ServiceProfile = ApiRequest<'createService'>['profile'];
export type ServiceQuery = ApiQuery<'listManagedServices'> & {
  page: number;
  limit: number;
};
export type ServicePage = ApiResponse<'listManagedServices'>;
export type Resource =
  ApiResponse<'listManagedServiceResources'>['items'][number];
export type Audit = ApiResponse<'listServiceAudit'>['items'][number];
export type DecisionBody = ApiRequest<'submitService'>;
export type DecisionAction =
  'submit' | 'pause' | 'archive' | 'approve' | 'reject';
export interface Company {
  id: string;
  name: string;
}
export interface ServiceContext {
  id: string;
  organizationId: string;
  review: boolean;
}
export type ServiceCommand =
  | { kind: 'create'; body: ApiRequest<'createService'> }
  | { kind: 'update'; id: string; body: ApiRequest<'updateService'> }
  | {
      kind: DecisionAction;
      id: string;
      organizationId: string;
      body: DecisionBody;
    };
export const statuses = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pending', label: 'En revisión' },
  { value: 'published', label: 'Publicado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'paused', label: 'Pausado' },
  { value: 'archived', label: 'Archivado' },
] as const;
export const categories = [
  { value: 'grooming', label: 'Peluquería' },
  { value: 'daycare', label: 'Guardería' },
  { value: 'training', label: 'Entrenamiento' },
  { value: 'lodging', label: 'Alojamiento' },
  { value: 'veterinary', label: 'Veterinaria' },
] as const;
export const species = [
  { value: 'dog', label: 'Perro' },
  { value: 'cat', label: 'Gato' },
  { value: 'bird', label: 'Ave' },
  { value: 'rabbit', label: 'Conejo' },
  { value: 'reptile', label: 'Reptil' },
  { value: 'rodent', label: 'Roedor' },
  { value: 'equine', label: 'Equino' },
  { value: 'other', label: 'Otra especie' },
] as const;
export function statusLabel(status: Service['status']) {
  return statuses.find((s) => s.value === status)?.label ?? status;
}
export function categoryLabel(category: Service['category']) {
  return categories.find((c) => c.value === category)?.label ?? category;
}
export { moneyLabel } from '../../../shared/formatting/colombia';

export type ProfessionalPage = ApiResponse<'listEligibleVeterinaryCredentials'>;
