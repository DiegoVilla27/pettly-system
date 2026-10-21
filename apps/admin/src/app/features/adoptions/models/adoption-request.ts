import type { ApiRequest, ApiResponse } from '@pettly/api-client';
import type { Publication } from './publication';
export type AdoptionRequest = ApiResponse<'getAdoptionRequest'>;
export type RequestItem =
  ApiResponse<'listShelterAdoptionRequests'>['items'][number];
export type RequestPage = ApiResponse<'listShelterAdoptionRequests'>;
export type RequestContext = {
  organizationId: string;
  publicationId: string;
  adoptionRequestId?: string;
};
export type RequestFilters = RequestContext & {
  page: number;
  limit: number;
  status?: RequestItem['status'];
};
export type RequestDetail = {
  publication: Publication;
  request: AdoptionRequest;
};
export type RequestCommand = { context: RequestContext } & (
  | { action: 'review'; body: ApiRequest<'reviewAdoptionRequest'> }
  | { action: 'complete'; body: ApiRequest<'completeAdoptionRequest'> }
);
export const requestStatuses = [
  { value: 'submitted', label: 'Recibida' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'approved', label: 'Aprobada, entrega pendiente' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'withdrawn', label: 'Retirada por el solicitante' },
  { value: 'completed', label: 'Entrega confirmada' },
  { value: 'closed', label: 'Cerrada' },
] as const;
export const requestStatusLabel = (status: RequestItem['status']) =>
  requestStatuses.find((s) => s.value === status)?.label ?? status;
export function requestActions(d: RequestDetail, actorId: string | undefined) {
  const r = d.request,
    p = d.publication;
  if (
    p.status !== 'published' ||
    r.applicantId === actorId ||
    !['submitted', 'in_review', 'approved'].includes(r.status)
  )
    return [];
  const consent = r.conditionsAccepted === p.conditions;
  return [
    ...(consent && r.status === 'submitted'
      ? [{ value: 'in_review', label: 'Iniciar revisión' }]
      : []),
    ...(consent && ['submitted', 'in_review'].includes(r.status)
      ? [{ value: 'approved', label: 'Aprobar solicitud' }]
      : []),
    { value: 'rejected', label: 'Rechazar solicitud' },
    ...(consent && r.status === 'approved'
      ? [{ value: 'complete', label: 'Confirmar entrega del animal' }]
      : []),
  ];
}
