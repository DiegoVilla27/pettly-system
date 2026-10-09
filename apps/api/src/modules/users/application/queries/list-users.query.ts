import type {
  GlobalRole,
  MembershipRole,
} from '../../../../shared/domain/authorization';
import type { UserStatus } from '../../domain/aggregates/user';
export class ListUsersQuery {
  constructor(
    readonly actorId: string,
    readonly page = 1,
    readonly limit = 20,
    readonly search?: string,
    readonly status?: UserStatus,
    readonly role?: GlobalRole,
    readonly organizationRole?: MembershipRole,
    readonly emailVerified?: boolean,
    readonly sortBy: 'createdAt' | 'email' | 'name' = 'createdAt',
    readonly sortOrder: 'asc' | 'desc' = 'desc',
  ) {}
}
