import type { Exam } from '@/config/exams'

/** Trudność tematu wyznacza kształt stacji: 0 koło, 1 trójkąt, 2 kwadrat, 3 pięciokąt. */
export type Difficulty = 0 | 1 | 2 | 3

export interface Station {
  name: string
  /** Nazwa na mapę, gdy pełna jest za długa. Pełna zostaje w panelu stacji. */
  shortName?: string
  difficulty: Difficulty
  /** Jedno albo dwa zdania o temacie, zrozumiałe dla ucznia; pokazuje je panel stacji. */
  description: string
}

/** Miejsce koloru w palecie linii, od najmocniejszego. */
export type LineColor = 1 | 2 | 3 | 4 | 5 | 6

export interface Line<Id extends string> {
  id: string
  name: string
  color: LineColor
  /** Stacje w kolejności na linii; sąsiednie łączy odcinek. */
  stations: readonly Id[]
}

export interface MapGraph<Id extends string> {
  stations: Readonly<Record<Id, Station>>
  /** Kolejność linii wyznacza też kolejność tematów w widoku listy. */
  lines: readonly Line<Id>[]
}

/**
 * Punkt siatki mapy pionowej: x to kolumna od lewej, y to wiersz od góry.
 * Mapa pozioma powstaje z tych samych punktów przez obrót.
 */
export interface GridPoint {
  x: number
  y: number
}

export type LabelSide =
  'right' | 'left' | 'above' | 'below' | 'above-right' | 'above-left' | 'below-right' | 'below-left'

export interface MapLayout<Id extends string> {
  points: Readonly<Record<Id, GridPoint>>
  /** Ręczne miejsce etykiety dla stacji, przy której automat wybiera brzydko. */
  labels?: Partial<Record<Id, { portrait?: LabelSide; landscape?: LabelSide }>>
}

export interface TopicMap<Id extends string = string> {
  examId: Exam['id']
  graph: MapGraph<Id>
  layout: MapLayout<Id>
}

export interface TopicProgress {
  /** Wszystkie zadania tematu. Warianty jednego zadania liczą się raz. */
  total: number
  /** Zadania, które uczeń zrobił co najmniej raz. */
  done: number
  /** Zrobione zadania, które czekają na powtórkę. */
  due: number
  /**
   * Ostatnio rozwiązane warianty zadań tematu (najwyżej 20) i ile z nich było dobrze. Wariant
   * to zadanie z innymi liczbami, z arkusza CKE albo wygenerowane. Starsze warianty wypadają,
   * więc słaby początek nie zaniża wyniku, gdy uczeń się poprawi.
   */
  recent: { attempts: number; correct: number }
  lastActivity?: Date
}

export interface MapProgress<Id extends string> {
  /** Temat bez wpisu jest jeszcze nieruszony. */
  topics: Partial<Record<Id, TopicProgress>>
  /** Ostatnio robiony temat, zaznaczony na mapie kółkiem. */
  lastStation?: Id
}
