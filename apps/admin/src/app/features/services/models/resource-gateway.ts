import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Resource, Service } from './service';
import type {
  ResourceContext,
  ResourceCommand,
  ResourceResult,
  ResourceAudit,
  Block,
  Availability,
  AvailabilityQuery,
} from './resource';
export interface ResourceGateway {
  execute(command: ResourceCommand): Observable<ResourceResult>;
  blocks(
    context: ResourceContext,
    from: string,
    to: string,
  ): Observable<Block[]>;
  audit(
    context: ResourceContext,
    page: number,
  ): Observable<{ items: ResourceAudit[]; total: number }>;
  availability(
    service: Service,
    resource: Resource,
    query: AvailabilityQuery,
  ): Observable<Availability>;
}
export const RESOURCE_GATEWAY = new InjectionToken<ResourceGateway>(
  'RESOURCE_GATEWAY',
);
