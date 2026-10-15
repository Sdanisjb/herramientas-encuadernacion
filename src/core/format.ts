/** Formatea un número con coma decimal (es), sin ceros sobrantes. */
export function fmt(value: number, digits = 1): string {
  return value.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}
