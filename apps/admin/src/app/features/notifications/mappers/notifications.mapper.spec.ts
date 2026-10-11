import { convertToParamMap } from '@angular/router';
import {
  mapInbox,
  mapNotice,
  mapPreferences,
  mapDelivery,
  parseInboxFilters,
} from './notifications.mapper';
import { retryCandidate } from '../models/notification';
import { notice, preferences, delivery } from '../testing/notification.fixture';
describe('Notification boundary contracts', () => {
  it('strips private fields and refuses a foreign mutation response or read before creation', () => {
    expect(
      mapNotice({
        ...notice,
        userId: notice.id,
        eventKey: 'private',
        details: { phone: 'private' },
      }),
    ).toEqual(notice);
    expect(() => mapNotice(notice, crypto.randomUUID())).toThrow();
    expect(() =>
      mapNotice({ ...notice, readAt: '2020-01-01T00:00:00.000Z' }),
    ).toThrow();
  });
  it('validates unique bounded filtered pages', () => {
    const q = {
      page: 1,
      limit: 10,
      unreadOnly: 'true' as const,
      category: 'organizations' as const,
    };
    const page = { items: [notice], total: 1, page: 1, limit: 10 };
    expect(mapInbox(page, q).items).toHaveLength(1);
    for (const value of [
      { ...page, items: [notice, notice] },
      { ...page, page: 2 },
      { ...page, items: [{ ...notice, readAt: notice.createdAt }] },
      { ...page, total: 0 },
    ])
      expect(() => mapInbox(value, q)).toThrow();
  });
  it('preserves virtual version zero and cannot disable mandatory channels', () => {
    expect(mapPreferences(preferences).version).toBe(0);
    expect(() =>
      mapPreferences({ ...preferences, inAppMandatory: false }),
    ).toThrow();
  });
  it('keeps nullable legacy delivery strings and safe projections', () => {
    expect(
      mapDelivery({
        ...delivery,
        subjectType: null,
        mailPurpose: null,
        failureKind: null,
        encryptedPayload: 'private',
      }),
    ).not.toHaveProperty('encryptedPayload');
    expect(() => mapDelivery({ ...delivery, failureKind: [] })).toThrow();
  });
  it('rejects invalid URL filters and evaluates expiry conservatively', () => {
    expect(
      parseInboxFilters(convertToParamMap({ unreadOnly: 'yes' })),
    ).toBeNull();
    expect(parseInboxFilters(convertToParamMap({ page: '10001' }))).toBeNull();
    const now = Date.parse(delivery.expiresAt);
    expect(retryCandidate(delivery, now - 1)).toBe(true);
    expect(retryCandidate(delivery, now)).toBe(false);
    expect(retryCandidate({ ...delivery, notificationId: null }, now - 1)).toBe(
      false,
    );
    expect(
      retryCandidate({ ...delivery, failureKind: 'superseded' }, now - 1),
    ).toBe(false);
  });
});
