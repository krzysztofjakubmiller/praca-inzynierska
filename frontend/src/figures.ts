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

export type Point = [number, number]

/** Tekst jak treść zadania, wzory w $...$; at to środek napisu. */
export interface FigureText {
  text: string
  at: Point
}

/** Wykres przechodzący przez podane punkty: prosta przez 2, parabola przez 3. */
export interface Graph {
  kind: 'liniowa' | 'kwadratowa'
  through: Point[]
  from?: number | null
  to?: number | null
  /** Kółko na końcu fragmentu: true pełne, false puste, brak pola to brak kółka. */
  from_closed?: boolean | null
  to_closed?: boolean | null
}

export interface CoordinatePlaneFigure {
  type: 'uklad-wspolrzednych'
  x: Point
  y: Point
  grid?: boolean
  x_labels?: number[] | null
  y_labels?: number[] | null
  graphs?: Graph[]
  points?: Point[]
  angles?: { vertex: Point; from: Point; to: Point; radius?: number }[]
  texts?: FigureText[]
}

export interface PlaneFigure {
  type: 'figura'
  points: Record<string, Point>
  names?: string[]
  polygons?: {
    points: string[]
    fill?: boolean | 'niebieski' | 'zolty' | 'tlo'
    dashed?: boolean
    outline?: boolean
  }[]
  segments?: {
    from: string
    to: string
    dashed?: boolean
    label?: string | null
    arrow?: boolean
  }[]
  dimensions?: { from: Point; to: Point; label: string }[]
  angles?: {
    vertex: string
    from: string
    to: string
    label?: string | null
    right?: boolean
    fill?: boolean
    arcs?: 1 | 2
  }[]
  circles?: {
    center: string
    radius: number
    radius_y?: number | null
    dashed?: boolean
    back_dashed?: boolean
    fill?: boolean
  }[]
  dots?: string[]
  texts?: FigureText[]
}

export interface SolidPoint {
  /** Środek podanych punktów. */
  midpoint?: string[] | null
  /** Punkt na okręgu dolnej (base) albo górnej (top) podstawy, kąt w stopniach, 270 z przodu. */
  base?: number | null
  top?: number | null
}

export interface SolidFigure {
  type: 'bryla'
  solid: 'prostopadloscian' | 'graniastoslup' | 'ostroslup' | 'walec' | 'stozek' | 'kula'
  n?: number | null
  a?: number | null
  b?: number | null
  h?: number | null
  r?: number | null
  names?: string[]
  points?: Record<string, SolidPoint>
  edge_labels?: { from: string; to: string; label: string }[]
  segments?: PlaneFigure['segments']
  polygons?: PlaneFigure['polygons']
  angles?: PlaneFigure['angles']
  dots?: string[]
}

export interface BarChartFigure {
  type: 'diagram-slupkowy'
  categories: string[]
  charts: { title?: string | null; values: number[] }[]
  x_label?: string | null
  y_label?: string | null
  y_max?: number | null
  y_step?: number | null
  show_values?: boolean
}

export interface PieChartFigure {
  type: 'diagram-kolowy'
  slices: { value: number; label?: string | null; legend?: string | null }[]
}

/** Komórka to sam tekst albo tekst zajmujący kilka kolumn. */
export type TableCell = string | { text: string; colspan?: number }

export interface TableFigure {
  type: 'tabela'
  rows: TableCell[][]
  header_rows?: number
}

export interface UnknownFigure {
  type: 'nieznany'
}

export type Figure =
  | NumberLineFigure
  | CoordinatePlaneFigure
  | PlaneFigure
  | SolidFigure
  | BarChartFigure
  | PieChartFigure
  | TableFigure
  | UnknownFigure

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

/** Odcinek na ekranie; odcinek o równych końcach to pojedynczy punkt, np. inny napis. */
export type Line = [Point, Point]

export function distanceToLine(point: Point, [from, to]: Line): number {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const lengthSquared = dx * dx + dy * dy
  const along = lengthSquared
    ? ((point[0] - from[0]) * dx + (point[1] - from[1]) * dy) / lengthSquared
    : 0
  const t = Math.max(0, Math.min(1, along))
  return Math.hypot(point[0] - (from[0] + t * dx), point[1] - (from[1] + t * dy))
}

export const clearance = (point: Point, lines: Line[]) =>
  Math.min(...lines.map((line) => distanceToLine(point, line)))

// Spośród miejsc na napis bierze to, które leży najdalej od wszystkich linii, żeby napis nie
// wchodził na żadną z nich. Przy prawie równej odległości wygrywa wcześniejsze na liście.
export function clearestSpot(candidates: Point[], lines: Line[]): Point {
  let best = candidates[0]!
  let bestClearance = -1
  for (const candidate of candidates) {
    const free = clearance(candidate, lines)
    if (free > bestClearance + 0.5) {
      best = candidate
      bestClearance = free
    }
  }
  return best
}

// Miejsca dookoła punktu, zaczynając od kierunku od środka rysunku, bo tam zwykle jest pusto.
export function spotsAround(point: Point, center: Point, distance: number): Point[] {
  const start = Math.atan2(point[1] - center[1], point[0] - center[0]) || 0
  return Array.from({ length: 24 }, (_, index) => {
    const turn = Math.ceil(index / 2) * (index % 2 ? 1 : -1)
    const angle = start + (turn * Math.PI) / 12
    return [point[0] + Math.cos(angle) * distance, point[1] + Math.sin(angle) * distance]
  })
}

// Miejsca po obu stronach odcinka: najpierw przy środku od strony zewnętrznej rysunku,
// potem bliżej końców.
export function spotsBeside(from: Point, to: Point, center: Point, distance: number): Point[] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
  let normal: Point = [-(to[1] - from[1]) / length, (to[0] - from[0]) / length]
  const middle: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
  const outward = (middle[0] - center[0]) * normal[0] + (middle[1] - center[1]) * normal[1]
  if (outward < 0) normal = [-normal[0], -normal[1]]
  return [0.5, 0.35, 0.65].flatMap((t) => {
    const x = from[0] + (to[0] - from[0]) * t
    const y = from[1] + (to[1] - from[1]) * t
    return [1, -1].map((side): Point => [
      x + side * normal[0] * distance,
      y + side * normal[1] * distance,
    ])
  })
}

export function centerOf(points: Point[]): Point {
  const sum = points.reduce((total, point) => [total[0] + point[0], total[1] + point[1]], [0, 0])
  return [sum[0] / points.length, sum[1] / points.length]
}

// Wielomian przechodzący przez podane punkty (wzór interpolacyjny Lagrange'a): przez 2 punkty
// to prosta, przez 3 parabola. Dzięki temu wzoru nie trzeba odczytywać z rysunku.
export function throughPoints(points: Point[]): (x: number) => number {
  return (x) =>
    points.reduce(
      (sum, [xi, yi], i) =>
        sum +
        yi *
          points.reduce(
            (product, [xj], j) => (j === i ? product : (product * (x - xj)) / (xi - xj)),
            1,
          ),
      0,
    )
}

export interface PlaneSpan {
  x: number
  y: number
}

// Układy z jednego zadania (np. warianty A–D) mają kratkę tej samej wielkości: krótszy zakres
// jest dociągany do najdłuższego.
export function coordinatePlaneSpan(figures: Figure[]): PlaneSpan {
  const planes = figures.filter((figure) => figure.type === 'uklad-wspolrzednych')
  return {
    x: Math.max(0, ...planes.map((plane) => plane.x[1] - plane.x[0])),
    y: Math.max(0, ...planes.map((plane) => plane.y[1] - plane.y[0])),
  }
}
