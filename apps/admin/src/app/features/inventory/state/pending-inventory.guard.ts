import type { CanDeactivateFn } from '@angular/router';
import type { InventoryDetailPage } from '../pages/inventory-detail.page';
export const pendingInventoryGuard: CanDeactivateFn<InventoryDetailPage> = (
  page,
) => page.canLeave();
