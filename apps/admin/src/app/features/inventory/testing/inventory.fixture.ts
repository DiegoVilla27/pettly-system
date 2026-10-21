import type {
  InventoryRow,
  MovementIntent,
  MovementResult,
} from '../models/inventory';
export const rowFixture: InventoryRow = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  organizationId: '123e4567-e89b-42d3-a456-426614174001',
  productId: '123e4567-e89b-42d3-a456-426614174002',
  productName: 'Alimento completo',
  sku: 'FOOD-SMALL',
  productStatus: 'published',
  variantStatus: 'active',
  stock: {
    variantId: '123e4567-e89b-42d3-a456-426614174000',
    onHand: 10,
    reserved: 3,
    available: 7,
    version: 3,
    updatedAt: '2026-10-10T00:00:00Z',
  },
};
export function resultFixture(intent: MovementIntent): MovementResult {
  const delta =
    intent.body.kind === 'issue' ? -intent.body.quantity : intent.body.quantity;
  return {
    stock: {
      ...rowFixture.stock,
      onHand: 10 + delta,
      available: 7 + delta,
      version: 4,
    },
    movement: {
      id: rowFixture.productId,
      variantId: intent.variantId,
      organizationId: intent.organizationId,
      actorId: rowFixture.productId,
      holdId: null,
      kind: intent.body.kind,
      onHandDelta: delta,
      reservedDelta: 0,
      onHandAfter: 10 + delta,
      reservedAfter: 3,
      versionAfter: 4,
      idempotencyKey: intent.body.idempotencyKey,
      reason: intent.body.reason,
      requestId: rowFixture.productId,
      createdAt: '2026-10-10T00:00:00Z',
    },
  };
}
