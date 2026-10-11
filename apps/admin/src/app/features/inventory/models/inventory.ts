import type { ApiRequest, ApiResponse, ApiQuery } from '@pettly/api-client';
export type InventoryRow = ApiResponse<'listManagedInventory'>['items'][number];
export type InventoryPage = ApiResponse<'listManagedInventory'>;
export type Stock = ApiResponse<'getManagedStock'>;
export type Movement = ApiResponse<'listInventoryMovements'>['items'][number];
export type Ledger = ApiResponse<'listInventoryMovements'>;
export type MovementBody = ApiRequest<'recordInventoryMovement'>;
export type MovementResult = ApiResponse<'recordInventoryMovement'>;
export type InventoryQuery = ApiQuery<'listManagedInventory'>;
export interface Company {
  id: string;
  name: string;
}
export interface InventoryContext {
  organizationId: string;
  variantId: string;
}
export interface MovementIntent extends InventoryContext {
  body: MovementBody;
}
export type MovementInput = Omit<
  MovementBody,
  'idempotencyKey' | 'expectedVersion'
>;
export const movementLabels: Record<Movement['kind'], string> = {
  receipt: 'Entrada',
  issue: 'Salida',
  adjustment: 'Ajuste',
  hold: 'Reserva',
  release: 'Liberación',
  consume: 'Consumo',
  expire: 'Vencimiento',
};
export const productLabels: Record<InventoryRow['productStatus'], string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  published: 'Publicado',
  rejected: 'Rechazado',
  paused: 'Pausado',
  archived: 'Archivado',
};
