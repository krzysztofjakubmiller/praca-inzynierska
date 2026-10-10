/**
 * Polska forma rzeczownika po liczbie: [jedno, kilka, wiele], np. zadanie, zadania, zadań.
 * „Kilka” to liczby kończące się na 2–4, poza 12–14.
 */
export function plural(count: number, [one, few, many]: [string, string, string]): string {
  if (count === 1) return one
  const lastDigit = count % 10
  const lastTwo = count % 100
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many
}

export const TASK_FORMS: [string, string, string] = ['zadanie', 'zadania', 'zadań']
