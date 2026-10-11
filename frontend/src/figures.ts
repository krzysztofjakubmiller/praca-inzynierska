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
  min: number
  max: number
  labels?: number[]
  intervals?: Interval[]
}

export interface UnknownFigure {
  type: 'nieznany'
}

export type Figure = NumberLineFigure | UnknownFigure

/** Klucz content to rysunek pod treścią, etykieta wariantu to rysunek w tym wariancie. */
export type Figures = Record<string, Figure>

// Zapas kresek za skrajnym podpisem albo końcem przedziału. Bez niego przedział do brzegu osi
// bywa krótszy niż odstęp między kreskami, bo Gemini liczy kreski z rysunku niedokładnie.
const MARGIN = 2

export function numberLineRange(figure: NumberLineFigure): { min: number; max: number } {
  const ends = (figure.intervals ?? []).flatMap((interval) => [interval.from, interval.to])
  const values = [...(figure.labels ?? []), ...ends].filter((value) => typeof value === 'number')
  if (!values.length) return { min: figure.min, max: figure.max }
  return {
    min: Math.min(figure.min, Math.min(...values) - MARGIN),
    max: Math.max(figure.max, Math.max(...values) + MARGIN),
  }
}

// Osie z jednego zadania (np. warianty A–D) dostają wspólny zakres, żeby leżały równo
// jedna pod drugą i miały podpisy tej samej wielkości.
export function withSharedRange(figures: Figures): Figures {
  const ranges = Object.values(figures)
    .filter((figure) => figure.type === 'os-liczbowa')
    .map(numberLineRange)
  if (!ranges.length) return figures
  const min = Math.min(...ranges.map((range) => range.min))
  const max = Math.max(...ranges.map((range) => range.max))
  return Object.fromEntries(
    Object.entries(figures).map(([place, figure]) => [
      place,
      figure.type === 'os-liczbowa' ? { ...figure, min, max } : figure,
    ]),
  )
}
