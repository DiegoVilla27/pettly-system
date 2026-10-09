import type {
  ServiceState,
  ResourceState,
  BlockState,
  ServiceAudit,
} from '../../results/service';
import type { ServicesQuery } from '../../queries/service.queries';
export interface ServicesWork {
  lock(key: string): Promise<void>;
  service(id: string): Promise<ServiceState | null>;
  saveService(s: ServiceState): Promise<void>;
  resource(id: string): Promise<ResourceState | null>;
  saveResource(r: ResourceState): Promise<void>;
  resources(org: string): Promise<ResourceState[]>;
  blocks(resourceId: string, from: Date, to: Date): Promise<BlockState[]>;
  block(id: string): Promise<BlockState | null>;
  saveBlock(b: BlockState): Promise<void>;
  list(q: ServicesQuery): Promise<{ items: ServiceState[]; total: number }>;
  audit(a: ServiceAudit): Promise<void>;
  audits(
    serviceId: string,
    page: number,
    limit: number,
  ): Promise<{ items: ServiceAudit[]; total: number }>;
}
export interface ServicesRepository {
  run<T>(work: (tx: ServicesWork) => Promise<T>): Promise<T>;
}
export const SERVICES_REPOSITORY = Symbol('SERVICES_REPOSITORY');
