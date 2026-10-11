import { mapOrder, mapPage, mapAudit, contractProblem } from './orders.mapper';
import { orderDto, order } from '../testing/order.fixture';
import { availableActions, orderMoney } from '../models/order';
describe('Accepted order contracts and lifecycle', () => {
  it('projects financial/fulfillment information without internal reservation/collector metadata', () => {
    const mapped = mapOrder(orderDto);
    expect(mapped.snapshot).not.toHaveProperty('collector');
    expect(mapped.snapshot.lines[0]).not.toHaveProperty('holdId');
    expect(mapped).not.toHaveProperty('quoteId');
    expect(mapped.snapshot.commission?.platformMinor).toBe(100005);
  });
  it('rejects mismatched totals, split, paid evidence and requested scope', () => {
    expect(() => mapOrder({ ...orderDto, totalMinor: 1 })).toThrow();
    expect(() => mapOrder({ ...orderDto, status: 'paid' })).toThrow();
    expect(() =>
      mapOrder({
        ...orderDto,
        snapshot: {
          ...orderDto.snapshot,
          commission: { ...orderDto.snapshot.commission, sellerMinor: 1 },
        },
      }),
    ).toThrow();
    expect(() =>
      mapOrder(orderDto, { orderId: order.id, organizationId: order.buyerId }),
    ).toThrow();
  });
  it('keeps historical orders without commission readable and labels actual currency', () => {
    const snapshot = { ...orderDto.snapshot };
    delete snapshot.commission;
    expect(
      mapOrder({ ...orderDto, snapshot }).snapshot.commission,
    ).toBeUndefined();
    expect(orderMoney(10050, 'COP')).toContain('COP');
    expect(orderMoney(10050, 'USD')).toContain('USD');
  });
  it('never offers preparation before payment or skips pickup/delivery transitions', () => {
    const now = Date.parse(order.createdAt);
    expect(availableActions(order, now)).toEqual(['cancel']);
    expect(availableActions(order, Date.parse(order.expiresAt))).toEqual([]);
    expect(availableActions({ ...order, status: 'paid' }, now)).toEqual([
      'preparing',
    ]);
    expect(availableActions({ ...order, status: 'preparing' }, now)).toEqual([
      'dispatched',
    ]);
    expect(
      availableActions(
        {
          ...order,
          status: 'preparing',
          snapshot: { ...order.snapshot, fulfillment: 'pickup' },
        },
        now,
      ),
    ).toEqual(['ready_for_pickup']);
    expect(availableActions({ ...order, status: 'delivered' }, now)).toEqual(
      [],
    );
  });
  it('rejects duplicate, foreign, filtered and wrong pagination records', () => {
    const q = { organizationId: order.organizationId, page: 1, limit: 20 };
    const page = { ...q, items: [orderDto], total: 1 };
    expect(mapPage(page, q).items).toHaveLength(1);
    expect(() =>
      mapPage({ ...page, items: [orderDto, orderDto], total: 2 }, q),
    ).toThrow();
    expect(() => mapPage(page, { ...q, status: 'paid' })).toThrow();
    expect(() => mapPage(page, { ...q, page: 2 })).toThrow();
  });
  it('bounds immutable history by order and page', () => {
    const c = { orderId: order.id, organizationId: order.organizationId };
    const row = {
      id: order.buyerId,
      orderId: order.id,
      version: 1,
      action: 'created',
      actorId: null,
      reason: 'Order accepted',
      requestId: order.organizationId,
      createdAt: order.createdAt,
    };
    const p = { items: [row], total: 1, page: 1, limit: 20 };
    expect(mapAudit(p, c, 1).items[0]?.actorId).toBeNull();
    expect(() =>
      mapAudit({ ...p, items: [{ ...row, orderId: order.buyerId }] }, c, 1),
    ).toThrow();
    expect(() => mapAudit(p, c, 2)).toThrow();
    expect(contractProblem().status).toBe(502);
  });
});
