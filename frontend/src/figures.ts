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
