/** Minimal private variant directory; caller authorizes the owning active business. */
export interface InventoryVariantQuery {
  organizationId: string;
  page: number;
  limit: number;
  search?: string;
  variantId?: string;
  status?: 'active' | 'archived';
}
export interface InventoryVariant {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  sku: string;
  productStatus:
    'draft' | 'pending' | 'published' | 'rejected' | 'paused' | 'archived';
  variantStatus: 'active' | 'archived';
}
export interface InventoryVariantPage {
  items: InventoryVariant[];
  total: number;
  page: number;
  limit: number;
}
export interface InventoryCatalog {
  inventoryVariants(
    query: InventoryVariantQuery,
  ): Promise<InventoryVariantPage>;
}
export const INVENTORY_CATALOG = Symbol('INVENTORY_CATALOG');
