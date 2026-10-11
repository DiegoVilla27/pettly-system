import type { ProductDetail } from '../models/product';
export const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const context = { organizationId: id(2), productId: id(1) };
export const detail: ProductDetail = {
  product: {
    id: id(1),
    organizationId: id(2),
    categoryId: id(3),
    name: 'Arnés cómodo',
    description: 'Arnés regulable para perros',
    brand: null,
    currency: 'COP',
    status: 'draft',
    version: 1,
    createdBy: id(4),
    reviewedBy: null,
    reviewedAt: null,
    reviewReason: null,
    createdAt: '2026-10-10T12:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
  },
  variants: [
    {
      id: id(5),
      productId: id(1),
      organizationId: id(2),
      sku: 'ARNES-M',
      priceMinor: 1999995,
      attributes: { talla: 'M' },
      status: 'active',
      createdAt: '2026-10-10T12:00:00.000Z',
      updatedAt: '2026-10-10T12:00:00.000Z',
    },
  ],
  photos: [],
};
