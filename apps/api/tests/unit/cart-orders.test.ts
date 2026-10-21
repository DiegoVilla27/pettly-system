import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Cart } from '../../src/modules/cart/domain/aggregates/cart';
import {
  Order,
  type QuoteState,
} from '../../src/modules/orders/domain/aggregates/order';
import {
  validatePolicy,
  money,
  tax,
  type CommercialPolicy,
} from '../../src/modules/orders/domain/value-objects/checkout';
import {
  CreateOrderDto,
  ConfigurePolicyDto,
  QuoteRequestDto,
} from '../../src/modules/orders/adapters/in/http/dtos/requests/orders.requests';
import { PutCartItemDto } from '../../src/modules/cart/adapters/in/http/dtos/requests/cart.requests';
const now = new Date('2026-10-09T12:00:00Z'),
  id = randomUUID(),
  buyer = randomUUID();
const contact = {
  recipient: 'Maria Rivera',
  phone: '+573001234567',
  countryCode: 'CO',
  city: 'Bogota',
  address: 'Calle 10 20',
  addressLine2: null,
  postalCode: null,
};
const policy: CommercialPolicy = {
  organizationId: id,
  currency: 'COP',
  enabled: true,
  pickupAddress: contact,
  shippingRules: [],
  taxMode: 'included',
  taxRates: {},
  shippingTaxBasisPoints: 0,
  collector: 'seller',
  terms: 'Pickup and delivery conditions explicitly accepted.',
  version: 1,
  updatedAt: now,
};
const quote: QuoteState = {
  id: randomUUID(),
  buyerId: buyer,
  cartId: randomUUID(),
  cartVersion: 2,
  createdAt: now,
  expiresAt: new Date(+now + 300000),
  snapshot: {
    organizationId: id,
    currency: 'COP',
    lines: [
      {
        variantId: randomUUID(),
        productId: randomUUID(),
        productVersion: 5,
        name: 'Dog food',
        sku: 'FOOD',
        attributes: {},
        quantity: 2,
        unitPriceMinor: 1000,
        subtotalMinor: 2000,
        taxMinor: 0,
        holdId: randomUUID(),
      },
    ],
    fulfillment: 'pickup',
    contact,
    pickupAddress: contact,
    subtotalMinor: 2000,
    shippingMinor: 0,
    taxMinor: null,
    totalMinor: 2000,
    taxMode: 'included',
    collector: 'seller',
    terms: policy.terms,
    policyVersion: 1,
  },
};
const order = () =>
  Order.create(randomUUID(), buyer, quote, randomUUID(), 'fingerprint', now);
test('cart requires a single company and currency, explicit quantity and current version', () => {
  const c = Cart.empty(randomUUID(), buyer, now);
  c.put(id, 2, id, 'COP', now);
  assert.throws(() => c.put(randomUUID(), 1, randomUUID(), 'COP', now));
  assert.throws(() => c.put(randomUUID(), 1, id, 'USD', now));
  for (const qty of [0, -1, 1.5, 100])
    assert.throws(() => c.put(id, qty, id, 'COP', now));
  assert.throws(() => c.expect(1));
  assert.equal(c.put(id, 2, id, 'COP', now), false);
  c.remove(id, now);
  assert.equal(c.snapshot().organizationId, null);
  assert.equal(c.snapshot().currency, null);
});
test('cart limits distinct lines and defends its snapshots from mutation', () => {
  const c = Cart.empty(randomUUID(), buyer, now);
  for (let n = 0; n < 50; n++) c.put(randomUUID(), 1, id, 'COP', now);
  assert.throws(() => c.put(randomUUID(), 1, id, 'COP', now));
  const s = c.snapshot();
  s.items[0].quantity = 99;
  assert.equal(c.snapshot().items[0].quantity, 1);
});
test('policy requires explicit shipping, bounded rates and included taxes never add another tax', () => {
  validatePolicy(policy);
  assert.throws(() => validatePolicy({ ...policy, pickupAddress: null }));
  assert.throws(() => validatePolicy({ ...policy, taxRates: { [id]: 1900 } }));
  assert.throws(() => validatePolicy({ ...policy, shippingTaxBasisPoints: 1 }));
  assert.throws(() =>
    validatePolicy({
      ...policy,
      shippingRules: [
        { countryCode: 'CO', city: 'Bogota', feeMinor: 0 },
        { countryCode: 'CO', city: 'bogota', feeMinor: 1 },
      ],
    }),
  );
  assert.throws(() =>
    validatePolicy({ ...policy, taxMode: 'added', taxRates: { [id]: 10001 } }),
  );
  assert.equal(tax(999, 1900), 190);
  assert.throws(() => money(Number.MAX_SAFE_INTEGER + 1));
  assert.throws(() => tax(Number.MAX_SAFE_INTEGER, 10000));
});
test('unpaid orders cannot fulfill and paid orders cannot use the unpaid cancellation flow', () => {
  const o = order();
  assert.throws(() => o.fulfill('preparing', now));
  assert.throws(() => o.settle(randomUUID(), 1999, 'COP', now));
  assert.throws(() => o.settle(randomUUID(), 2000, 'USD', now));
  const payment = randomUUID();
  assert.equal(o.settle(payment, 2000, 'COP', now), true);
  assert.equal(o.settle(payment, 2000, 'COP', now), false);
  assert.throws(() => o.settle(payment, 2001, 'COP', now));
  assert.throws(() => o.cancel(now));
  assert.throws(() => o.fulfill('dispatched', now));
  o.fulfill('preparing', now);
  assert.throws(() => o.fulfill('dispatched', now));
  o.fulfill('ready_for_pickup', now);
  o.fulfill('delivered', now);
  assert.throws(() => o.fulfill('delivered', now));
});
test('order snapshots, quote ownership and expiry are immutable business boundaries', () => {
  assert.throws(() => Order.create(id, randomUUID(), quote, id, '', now));
  assert.throws(() =>
    Order.create(id, buyer, quote, id, '', new Date(+now + 300000)),
  );
  const o = order();
  o.snapshot().snapshot.contact.city = 'Changed';
  assert.equal(o.snapshot().snapshot.contact.city, 'Bogota');
  assert.equal(o.expire(new Date(+now + 1799999)), false);
  assert.equal(o.expire(new Date(+now + 1800000)), true);
  assert.equal(o.expire(new Date(+now + 1800000)), false);
  assert.throws(() => o.settle(id, 2000, 'COP', new Date(+now + 1800000)));
  assert.throws(() => o.cancel(now));
});
test('strict request DTOs reject buyer/payment escalation and invalid commercial inputs', () => {
  const data = {
    quoteId: quote.id,
    expectedTotalMinor: 2000,
    consent: true,
    idempotencyKey: randomUUID(),
  };
  assert.equal(CreateOrderDto.schema.safeParse(data).success, true);
  for (const extra of [
    { buyerId: buyer },
    { status: 'paid' },
    { paymentId: id },
    { totalMinor: 1 },
  ])
    assert.equal(
      CreateOrderDto.schema.safeParse({ ...data, ...extra }).success,
      false,
    );
  assert.equal(
    CreateOrderDto.schema.safeParse({ ...data, consent: false }).success,
    false,
  );
  assert.equal(
    PutCartItemDto.schema.safeParse({
      expectedVersion: 1,
      quantity: 1,
      organizationId: id,
    }).success,
    false,
  );
  assert.equal(
    QuoteRequestDto.schema.safeParse({
      expectedCartVersion: 1,
      fulfillment: 'delivery',
      contact: { ...contact, phone: '3001234567' },
    }).success,
    false,
  );
  const { organizationId, version, updatedAt, ...configuration } = policy;
  void organizationId;
  void version;
  void updatedAt;
  assert.equal(
    ConfigurePolicyDto.schema.safeParse({
      ...configuration,
      expectedVersion: 0,
      reason: 'Commercial terms explicitly configured.',
    }).success,
    true,
  );
});
