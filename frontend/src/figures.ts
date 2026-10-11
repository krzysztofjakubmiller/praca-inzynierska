// Format rysunków odpowiada klasom w backend/app/figures.py.

export interface Interval {
  /** Brak końca (null) to przedział do brzegu osi. */
  from?: number | null
  to?: number | null
  from_closed?: boolean
  to_closed?: boolean
}

export interface NumberLineFigure {
  type: 'os-liczbowa'
  labels?: number[]
  intervals?: Interval[]
}

export interface UnknownFigure {
  type: 'nieznany'
}

export type Figure = NumberLineFigure | UnknownFigure

/** Klucz content to rysunek pod treścią, etykieta wariantu to rysunek w tym wariancie. */
export type Figures = Record<string, Figure>

// Na arkuszach CKE oś wystaje o kilka kresek po obu stronach skrajnych liczb. Zakresu od Gemini
// nie bierzemy, bo liczy kreski niedokładnie i oś wychodzi niesymetryczna.
const MARGIN = 3

function numberLineValues(figure: NumberLineFigure): number[] {
  const ends = (figure.intervals ?? []).flatMap((interval) => [interval.from, interval.to])
  return [...(figure.labels ?? []), ...ends].filter((value) => typeof value === 'number')
}

export interface Range {
  min: number
  max: number
}

// Osie z jednego zadania (np. warianty A–D) rysujemy we wspólnym zakresie, żeby leżały równo
// jedna pod drugą i miały podpisy tej samej wielkości.
export function numberLineRange(figures: Figure[]): Range {
  const values = figures.filter((figure) => figure.type === 'os-liczbowa').flatMap(numberLineValues)
  // Oś bez liczb odrzuca backend; zakres wokół zera tylko na czas poprawiania JSON-a w panelu.
  if (!values.length) return { min: -MARGIN, max: MARGIN }
  return { min: Math.min(...values) - MARGIN, max: Math.max(...values) + MARGIN }
}
