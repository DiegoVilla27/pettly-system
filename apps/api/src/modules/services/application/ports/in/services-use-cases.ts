import type {
  ConfigureServiceCommand,
  ConfigureResourceCommand,
  ServiceDecisionCommand,
  BlockCommand,
} from '../../commands/service.commands';
import type {
  ServicesQuery,
  AvailabilityQuery,
} from '../../queries/service.queries';
import type { ServicesWork } from '../out/services-repository';
import type {
  ServiceState,
  ResourceState,
  BlockState,
} from '../../results/service';
export interface ServicesUseCases {
  publicResources(id: string): Promise<ResourceState[]>;
  preview(id: string, actorId: string): Promise<ServiceState>;
  activeBlocks(
    resourceId: string,
    actorId: string,
    from: Date,
    to: Date,
  ): Promise<BlockState[]>;
  configure(c: ConfigureServiceCommand): Promise<ServiceState>;
  resource(c: ConfigureResourceCommand): Promise<ResourceState>;
  decision(c: ServiceDecisionCommand): Promise<ServiceState>;
  block(c: BlockCommand): Promise<BlockState>;
  release(c: BlockCommand): Promise<BlockState>;
  get(id: string, actorId?: string): Promise<ServiceState>;
  list(q: ServicesQuery): ReturnType<ServicesWork['list']>;
  resources(org: string, actorId: string): Promise<ResourceState[]>;
  audits(
    id: string,
    actor: string,
    page: number,
    limit: number,
  ): ReturnType<ServicesWork['audits']>;
  availability(q: AvailabilityQuery): Promise<{
    serviceVersion: number;
    resourceVersion: number;
    timeZone: 'America/Bogota';
    slots: {
      startsAt: Date;
      endsAt: Date;
      remaining: number;
      totalMinor: number;
    }[];
    truncated: boolean;
  }>;
}
export const SERVICES_USE_CASES = Symbol('SERVICES_USE_CASES');
