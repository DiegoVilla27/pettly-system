const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'medium',
  timeStyle: 'short',
});
const moneyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  currencyDisplay: 'code',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export function colombiaDateTime(value: string): string {
  return dateFormatter.format(new Date(value));
}
export function moneyLabel(minor: number): string {
  return moneyFormatter.format(minor / 100);
}
