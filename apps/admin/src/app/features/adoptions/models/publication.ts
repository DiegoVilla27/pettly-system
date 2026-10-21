import type { ApiRequest, ApiResponse } from '@pettly/api-client';
export type Publication = ApiResponse<'getManagedAdoptionPublication'>;
export type Profile = ApiRequest<'createAdoptionPublication'>['profile'];
export type PublicationPage = ApiResponse<'listManagedAdoptionPublications'>;
export type Audit = ApiResponse<'listAdoptionAudit'>;
export type Decision = ApiRequest<'submitAdoptionPublication'>;
export type Context = {
  publicationId: string;
  organizationId?: string;
  review: boolean;
};
export type Filters = {
  page: number;
  limit: number;
  review: boolean;
  organizationId?: string;
  status?: Publication['status'];
};
export type Command = { context: Context } & (
  | { action: 'update'; body: ApiRequest<'updateAdoptionPublication'> }
  | { action: 'review'; body: ApiRequest<'reviewAdoptionPublication'> }
  | { action: 'submit' | 'pause' | 'archive'; body: Decision }
);
export type Shelter = { id: string; name: string };
export type Candidate = Pick<
  ApiResponse<'getAnimal'>,
  'id' | 'name' | 'organizationId' | 'status' | 'ownerUserId'
>;
export const statuses = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pending', label: 'En revisión' },
  { value: 'published', label: 'Publicada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'paused', label: 'Pausada' },
  { value: 'closed', label: 'Adopción completada' },
  { value: 'deleted', label: 'Archivada' },
] as const;
export const statusLabel = (s: Publication['status']) =>
  statuses.find((x) => x.value === s)?.label ?? s;

export const auditLabels: Record<Audit['items'][number]['action'], string> = {
  'publication.created': 'Publicación preparada',
  'publication.updated': 'Ficha pública actualizada',
  'publication.submitted': 'Enviada a revisión',
  'publication.approved': 'Publicación aprobada',
  'publication.rejected': 'Publicación rechazada',
  'publication.paused': 'Publicación pausada',
  'publication.deleted': 'Publicación archivada',
  'publication.closed': 'Publicación cerrada',
  'request.submitted': 'Solicitud recibida',
  'request.reviewed': 'Solicitud revisada',
  'request.withdrawn': 'Solicitud retirada',
  'request.completed': 'Entrega confirmada',
  'request.closed': 'Solicitud cerrada',
};
