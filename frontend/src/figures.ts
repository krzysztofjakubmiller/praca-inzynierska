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
    fill?: boolean | 'niebieski' | 'zolty'
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
  angles?: { vertex: string; from: string; to: string; label?: string | null; right?: boolean }[]
  texts?: FigureText[]
}

export interface SolidFigure {
  type: 'bryla'
  solid: 'prostopadloscian'
  a: number
  b: number
  h: number
  names?: string[]
  edge_labels?: { from: string; to: string; label: string }[]
}

export interface UnknownFigure {
  type: 'nieznany'
}

export type Figure =
  NumberLineFigure | CoordinatePlaneFigure | PlaneFigure | SolidFigure | UnknownFigure

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

// Napisy przy punktach i krawędziach odsuwamy od środka rysunku, żeby nie wchodziły na linie.
export function awayFrom(point: Point, center: Point, distance: number): Point {
  const dx = point[0] - center[0]
  const dy = point[1] - center[1]
  const length = Math.hypot(dx, dy)
  if (!length) return [point[0], point[1] - distance]
  return [point[0] + (dx / length) * distance, point[1] + (dy / length) * distance]
}

// Środek odcinka przesunięty prostopadle do niego, na zewnątrz rysunku.
export function besideSegment(from: Point, to: Point, center: Point, distance: number): Point {
  const middle: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
  let normal: Point = [-(to[1] - from[1]) / length, (to[0] - from[0]) / length]
  const outward = (middle[0] - center[0]) * normal[0] + (middle[1] - center[1]) * normal[1]
  if (outward < 0) normal = [-normal[0], -normal[1]]
  return [middle[0] + normal[0] * distance, middle[1] + normal[1] * distance]
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

// Napis przy wierzchołku stawiamy w najszerszej wolnej szczelinie między wychodzącymi z niego
// liniami, żeby nie leżał na żadnej z nich. Bez linii odsuwamy go od środka rysunku.
export function freeSpot(point: Point, neighbors: Point[], center: Point, distance: number): Point {
  if (!neighbors.length) return awayFrom(point, center, distance)
  const angles = neighbors
    .map(([x, y]) => Math.atan2(y - point[1], x - point[0]))
    .sort((first, second) => first - second)
  let best = { gap: -1, middle: 0 }
  angles.forEach((angle, index) => {
    const next = index + 1 < angles.length ? angles[index + 1]! : angles[0]! + 2 * Math.PI
    if (next - angle > best.gap) best = { gap: next - angle, middle: (angle + next) / 2 }
  })
  return [point[0] + Math.cos(best.middle) * distance, point[1] + Math.sin(best.middle) * distance]
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
