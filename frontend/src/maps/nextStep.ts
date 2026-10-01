import { listOrder } from './order'
import type { MapProgress, TopicMap } from './types'

export interface DiagnosticSheets {
  /** Kiedy uczeń zrobił ostatni arkusz diagnostyczny; bez daty nie zrobił jeszcze żadnego. */
  last?: Date
  /** Termin kolejnego arkusza. */
  next?: Date
}

export type NextStep =
  | { kind: 'diagnostic'; first: boolean }
  | { kind: 'reviews'; count: number }
  | { kind: 'continue'; stationId: string }

/** Wszystkie zadania, które czekają na powtórkę, ze wszystkich tematów. */
export function dueTotal(progress: MapProgress<string> | undefined): number {
  return Object.values(progress?.topics ?? {}).reduce((sum, topic) => sum + (topic?.due ?? 0), 0)
}

/**
 * Co uczeń powinien zrobić teraz: najpierw arkusz diagnostyczny (pierwszy albo ten, którego
 * termin minął), potem powtórki, a gdy ich nie ma, dalej ostatnio robiony temat.
 */
export function nextStep(
  map: TopicMap,
  progress: MapProgress<string> | undefined,
  sheets: DiagnosticSheets,
  today = new Date(),
): NextStep {
  if (!sheets.last) return { kind: 'diagnostic', first: true }
  if (sheets.next && sheets.next <= today) return { kind: 'diagnostic', first: false }
  const count = dueTotal(progress)
  if (count > 0) return { kind: 'reviews', count }
  return { kind: 'continue', stationId: progress?.lastStation ?? listOrder(map)[0]! }
}
