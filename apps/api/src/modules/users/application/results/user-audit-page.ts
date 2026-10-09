import type { UserAuditEntry } from '../ports/out/users-administration';
export interface UserAuditPage {
  items: UserAuditEntry[];
  total: number;
  page: number;
  limit: number;
}
