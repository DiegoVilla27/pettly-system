import type { ApiResponse } from '@pettly/api-client';
import { mapPayment } from '../mappers/payments.mapper';
export const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const paymentDto: ApiResponse<'getVisiblePayment'> = {
  id: id(1),
  orderId: id(2),
  buyerId: id(3),
  organizationId: id(4),
  provider: 'test',
  reference: null,
  checkoutUrl: null,
  status: 'created',
  distributionStatus: 'unconfirmed',
  amountMinor: 13000,
  currency: 'COP',
  feeMinor: null,
  version: 1,
  allocation: {
    policyId: 'product-subtotal-v1:1000',
    rateBasisPoints: 1000,
    base: 'product_subtotal',
    baseMinor: 10000,
    platformMinor: 1000,
    sellerMinor: 12000,
    totalMinor: 13000,
    processingFeeBearer: 'seller',
  },
  createdAt: '2026-10-10T12:00:00.000Z',
  updatedAt: '2026-10-10T12:00:00.000Z',
  expiresAt: '2026-10-10T12:30:00.000Z',
};
export const payment = mapPayment(paymentDto);
export const policy: ApiResponse<'getPaymentPolicy'> = {
  rateBasisPoints: 2000,
  percent: 20,
  base: 'product_subtotal',
  processingFeeBearer: 'seller',
  provider: 'test',
  providerEnabled: true,
};
