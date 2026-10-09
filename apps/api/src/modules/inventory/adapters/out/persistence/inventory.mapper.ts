import type { InventoryHold } from '@prisma/client';
import type { HoldState } from '../../../application/results/inventory';
export class InventoryPersistenceMapper {
  static hold(row: InventoryHold): HoldState {
    return { ...row, status: row.status as HoldState['status'] };
  }
}
