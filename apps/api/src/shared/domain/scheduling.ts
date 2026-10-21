import { ApplicationError } from './application-error';
export const BOOKING_TIME_ZONE = 'America/Bogota' as const;
export type ServiceKind = 'appointment' | 'lodging';
export interface WeeklyWindow {
  day: number;
  startMinute: number;
  endMinute: number;
}
export interface TimeRange {
  startsAt: Date;
  endsAt: Date;
}
export interface ResourceCalendar {
  kind: ServiceKind;
  windows: WeeklyWindow[];
}
export function invalid(message: string): never {
  throw new ApplicationError('INVALID_INPUT', message);
}
export function civilDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + 'T00:00:00Z')) ||
    new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value
  )
    invalid('Use a valid ISO calendar date.');
  return value;
}
export function localDay(time: Date) {
  return new Date(time.getTime() - 5 * 3600000).toISOString().slice(0, 10);
}
export function localMinute(time: Date) {
  const local = new Date(time.getTime() - 5 * 3600000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}
export function localInstant(day: string, minute: number) {
  civilDate(day);
  if (!Number.isInteger(minute) || minute < 0 || minute > 1440)
    invalid('Invalid local minute.');
  return new Date(Date.parse(day + 'T00:00:00-05:00') + minute * 60000);
}
export function nextDay(day: string, days = 1) {
  return new Date(Date.parse(civilDate(day) + 'T00:00:00Z') + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function dayOfWeek(day: string) {
  return new Date(civilDate(day) + 'T00:00:00Z').getUTCDay() || 7;
}
export function overlap(a: TimeRange, b: TimeRange) {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}
export function validateWindows(kind: ServiceKind, windows: WeeklyWindow[]) {
  if (!Array.isArray(windows) || !windows.length || windows.length > 21)
    invalid('Configure 1–21 weekly windows.');
  for (const w of windows) {
    if (
      ![w.day, w.startMinute, w.endMinute].every(Number.isInteger) ||
      w.day < 1 ||
      w.day > 7 ||
      w.startMinute < 0 ||
      w.endMinute > 1440 ||
      w.startMinute >= w.endMinute ||
      w.startMinute % 15 ||
      w.endMinute % 15 ||
      (kind === 'lodging' && (w.startMinute !== 0 || w.endMinute !== 1440))
    )
      invalid(
        'Weekly windows require ISO weekday 1–7 and quarter-hour minutes; lodging uses full-day windows.',
      );
  }
  const sorted = [...windows].sort(
    (a, b) => a.day - b.day || a.startMinute - b.startMinute,
  );
  for (let i = 1; i < sorted.length; i++)
    if (
      sorted[i].day === sorted[i - 1].day &&
      sorted[i].startMinute < sorted[i - 1].endMinute
    )
      invalid('Weekly windows must not overlap.');
}
export function fitsCalendar(r: ResourceCalendar, t: TimeRange) {
  const first = localDay(t.startsAt),
    last = localDay(new Date(+t.endsAt - 1));
  if (r.kind === 'appointment') {
    if (first !== last) return false;
    const start = localMinute(t.startsAt),
      end = localMinute(new Date(+t.endsAt - 1)) + 1;
    return r.windows.some(
      (w) =>
        w.day === dayOfWeek(first) &&
        w.startMinute <= start &&
        w.endMinute >= end,
    );
  }
  const departure = localDay(t.endsAt);
  for (let day = first; day < departure; day = nextDay(day))
    if (
      !r.windows.some(
        (w) =>
          w.day === dayOfWeek(day) &&
          w.startMinute === 0 &&
          w.endMinute === 1440,
      )
    )
      return false;
  return departure > first;
}
export function peakUsage(ranges: TimeRange[]) {
  const events = new Map<number, number>();
  for (const r of ranges) {
    events.set(+r.startsAt, (events.get(+r.startsAt) ?? 0) + 1);
    events.set(+r.endsAt, (events.get(+r.endsAt) ?? 0) - 1);
  }
  let count = 0,
    peak = 0;
  for (const [, delta] of [...events].sort((a, b) => a[0] - b[0])) {
    count += delta;
    peak = Math.max(peak, count);
  }
  return peak;
}
export function availableCapacity(
  capacity: number,
  range: TimeRange,
  busy: TimeRange[],
  blocks: TimeRange[],
) {
  if (blocks.some((b) => overlap(range, b))) return 0;
  const clipped = busy
    .filter((b) => overlap(range, b))
    .map((b) => ({
      startsAt: new Date(Math.max(+b.startsAt, +range.startsAt)),
      endsAt: new Date(Math.min(+b.endsAt, +range.endsAt)),
    }));
  return Math.max(0, capacity - peakUsage(clipped));
}
