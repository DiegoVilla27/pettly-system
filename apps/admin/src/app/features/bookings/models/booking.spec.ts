import { availableActions } from './booking';
import { booking } from '../testing/booking.fixture';
describe('Provider action deadlines', () => {
  it('offers pending decisions only before expiry and preserves closed states', () => {
    expect(availableActions(booking, Date.parse(booking.createdAt))).toEqual([
      'confirm',
      'reject',
      'cancel',
    ]);
    expect(
      availableActions(booking, Date.parse(booking.expiresAt ?? '')),
    ).toEqual([]);
    for (const status of [
      'expired',
      'cancelled',
      'rejected',
      'completed',
      'no_show',
    ] as const)
      expect(
        availableActions(
          { ...booking, status, expiresAt: null },
          Date.parse(booking.startsAt),
        ),
      ).toEqual([]);
  });
  it('enforces exact attendance, cancellation and fifteen-minute grace boundaries', () => {
    const b = { ...booking, status: 'confirmed' as const, expiresAt: null },
      start = Date.parse(b.startsAt),
      end = Date.parse(b.endsAt);
    expect(availableActions(b, start - 1)).toEqual(['cancel']);
    expect(availableActions(b, start)).toEqual(['start']);
    expect(availableActions(b, start + 15 * 60000)).toEqual([
      'start',
      'no_show',
    ]);
    expect(availableActions(b, end)).toEqual(['no_show']);
    expect(availableActions({ ...b, status: 'in_progress' }, end)).toEqual([
      'complete',
    ]);
  });
});
