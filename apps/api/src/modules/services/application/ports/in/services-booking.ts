import type {
  ServiceState,
  ResourceState,
  BlockState,
} from '../../results/service';
export interface ServicesBooking {
  inspect(id: string): Promise<ServiceState | null>;
  resource(id: string): Promise<ResourceState | null>;
  offer(
    serviceId: string,
    resourceId: string,
    serviceVersion: number,
    resourceVersion: number,
  ): Promise<{
    service: ServiceState;
    resource: ResourceState;
    organizationName: string;
    professionalVerifiedUntil?: Date | null;
  }>;
  blocks(id: string, from: Date, to: Date): Promise<BlockState[]>;
}
export const SERVICES_BOOKING = Symbol('SERVICES_BOOKING');
