import test from 'node:test';
import assert from 'node:assert/strict';
import { OrdersQuery } from '../../src/modules/orders/application/queries/order.queries';
import { ListOrdersDto } from '../../src/modules/orders/adapters/in/http/dtos/requests/orders.requests';
test('order search is bounded, literal and never substitutes authorized scope', () => {
  const query = new OrdersQuery('buyer', 2, 10, 'business', 'paid', '%_');
  assert.equal(query.actorId, 'buyer');
  assert.equal(query.organizationId, 'business');
  assert.equal(query.search, '%_');
  for (const search of ['x', '  trimmed', 'invalid\ntext', 'a'.repeat(101)])
    assert.throws(
      () => new OrdersQuery('buyer', 1, 20, undefined, undefined, search),
    );
  assert.equal(
    ListOrdersDto.schema.parse({
      organizationId: '00000000-0000-4000-8000-000000000001',
      search: ' Cliente ',
    }).search,
    'Cliente',
  );
  assert.throws(() => ListOrdersDto.schema.parse({ search: 'x' }));
  assert.throws(() =>
    ListOrdersDto.schema.parse({ search: 'Cliente', buyerId: 'foreign' }),
  );
});
