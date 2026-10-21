import { Prisma } from '@prisma/client';
import type {
  ServiceState,
  ResourceState,
} from '../../../application/results/service';
export class ServicesPersistenceMapper {
  static json(s: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(s)) as Prisma.InputJsonValue;
  }
  static service(snapshot: Prisma.JsonValue): ServiceState {
    const s = snapshot as unknown as ServiceState;
    return {
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : null,
    };
  }
  static resource(snapshot: Prisma.JsonValue): ResourceState {
    const s = snapshot as unknown as ResourceState;
    return {
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    };
  }
}
