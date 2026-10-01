/** Licznik na przycisku: powyżej 99 zostaje „99+”, żeby przycisk nie rósł. */
export function shortCount(count: number): string {
  return count > 99 ? '99+' : String(count)
}
