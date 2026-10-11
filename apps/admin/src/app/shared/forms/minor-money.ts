/** Decimal input without grouping; convert using integer arithmetic, never floating-point multiplication. */
export function copToMinor(value: string): number | null {
  if (!/^\d{1,8}(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
  const [whole, decimal = ''] = value.trim().replace(',', '.').split('.');
  const minor = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  return minor >= 1 && minor <= 2147483647 ? minor : null;
}
export function minorToInput(value: number): string {
  return (
    String(Math.floor(value / 100)) + '.' + String(value % 100).padStart(2, '0')
  );
}
