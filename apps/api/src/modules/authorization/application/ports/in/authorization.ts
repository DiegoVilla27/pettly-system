import type { Permission } from '../../../../../shared/domain/authorization';
import type { AccessResult, RoleDefinition } from '../../results/access';
import type {
  GetAccessQuery,
  GetUserAccessQuery,
} from '../../queries/get-access.query';
export interface Authorization {
  roles(): readonly RoleDefinition[];
  getUserAccess(query: GetUserAccessQuery): Promise<AccessResult>;
  getAccess(query: GetAccessQuery): Promise<AccessResult>;
  requirePermission(
    userId: string,
    permission: Permission,
    organizationId?: string,
  ): Promise<void>;
}
export const AUTHORIZATION = Symbol('AUTHORIZATION');
