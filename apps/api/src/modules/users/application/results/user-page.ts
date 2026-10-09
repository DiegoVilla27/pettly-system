import type { UserProfile } from './user-profile';
export interface UserPage {
  items: UserProfile[];
  total: number;
  page: number;
  limit: number;
}
