import type { ApiRequest, ApiResponse, ApiQuery } from '@pettly/api-client';
import type { Resource } from './service';
export type ResourceProfile = ApiRequest<'createServiceResource'>['profile'];
export type ResourceAudit =
  ApiResponse<'listServiceResourceAudit'>['items'][number];
export type Block = ApiResponse<'blockServiceResource'>;
export type Availability = ApiResponse<'getServiceAvailability'>;
export type AvailabilityQuery = ApiQuery<'getServiceAvailability'>;
export interface ResourceContext {
  organizationId: string;
  resourceId: string;
}
export type ResourceCommand =
  | { kind: 'create'; body: ApiRequest<'createServiceResource'> }
  | {
      kind: 'update';
      context: ResourceContext;
      body: ApiRequest<'updateServiceResource'>;
    }
  | {
      kind: 'block';
      context: ResourceContext;
      body: ApiRequest<'blockServiceResource'>;
    }
  | {
      kind: 'release';
      context: ResourceContext;
      blockId: string;
      body: ApiRequest<'releaseServiceBlock'>;
    };
export type ResourceResult =
  { kind: 'resource'; resource: Resource } | { kind: 'block'; block: Block };
export const weekdays = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
] as const;
export { colombiaDateTime } from '../../../shared/formatting/colombia';
