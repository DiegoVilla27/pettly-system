export type {
  ServiceDetails,
  ServiceState,
  ResourceDetails,
  ResourceState,
  BlockState,
} from '../../domain/aggregates/service';
export interface ServiceAudit {
  id: string;
  organizationId: string;
  serviceId: string | null;
  resourceId: string | null;
  actorId: string;
  action: string;
  version: number;
  snapshot: unknown;
  reason: string;
  requestId: string;
  createdAt: Date;
}
