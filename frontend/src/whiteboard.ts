import { distanceToLine } from '@/figures'

export type Tool = 'pen' | 'line' | 'eraser'

export interface Point {
  x: number
  y: number
  /** Grubość linii w tym punkcie, w pikselach CSS. */
  width: number
}

export interface Stroke {
  tool: Tool
  points: Point[]
  /** Kolor pisaka; bez koloru kreska ma kolor tekstu z motywu. */
  color?: string
  dashed?: boolean
}

/**
 * Grubość linii w punkcie. Rysik podaje nacisk od 0 do 1 i linia grubieje przy mocniejszym
 * docisku; palec i mysz podają stały nacisk, więc rysują równą linią.
 */
export function lineWidth(base: number, pointerType: string, pressure: number): number {
  if (pointerType !== 'pen' || pressure <= 0) return base
  return base * (0.4 + 1.2 * pressure)
}

// Kreska to odcinki między kolejnymi punktami, każdy z grubością swojego punktu, więc zmiana
// nacisku w trakcie kreski jest widoczna. Pojedynczy punkt (stuknięcie) rysuje się jako kropka.
// from pozwala dorysować tylko nowe odcinki w trakcie pisania.
export function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  color: string,
  from = 1,
) {
  context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  context.strokeStyle = stroke.color ?? color
  context.fillStyle = stroke.color ?? color
  context.lineCap = 'round'
  context.lineJoin = 'round'
  const [first, ...rest] = stroke.points
  if (!first) return
  if (!rest.length) {
    context.beginPath()
    context.arc(first.x, first.y, first.width / 2, 0, Math.PI * 2)
    context.fill()
    return
  }
  // Każdy odcinek to osobna ścieżka, więc wzór przerywanej linii zaczynałby się od nowa na
  // każdym z kilkupikselowych odcinków i linia wyglądałaby na ciągłą. lineDashOffset
  // przesuwa wzór o długość kreski narysowanej wcześniej. Przerwa jest dłuższa o grubość,
  // bo zaokrąglone końce zachodzą na nią z obu stron.
  const dash = Math.max(first.width * 3, 8)
  context.setLineDash(stroke.dashed ? [dash, dash + first.width] : [])
  let length = 0
  let previous = first
  rest.forEach((point, index) => {
    if (index + 1 >= from) {
      context.beginPath()
      context.lineWidth = point.width
      context.lineDashOffset = length
      context.moveTo(previous.x, previous.y)
      context.lineTo(point.x, point.y)
      context.stroke()
    }
    length += Math.hypot(point.x - previous.x, point.y - previous.y)
    previous = point
  })
  context.setLineDash([])
}

export function drawStrokes(context: CanvasRenderingContext2D, strokes: Stroke[], color: string) {
  for (const stroke of strokes) drawStroke(context, stroke, color)
  context.globalCompositeOperation = 'source-over'
}

/** Czy kreska przechodzi bliżej niż radius od punktu (x, y). Dla gumki do całych kresek. */
export function touches(stroke: Stroke, x: number, y: number, radius: number): boolean {
  const [first, ...rest] = stroke.points
  if (!first) return false
  if (!rest.length) return Math.hypot(first.x - x, first.y - y) <= radius + first.width / 2
  let previous = first
  for (const point of rest) {
    const line: [[number, number], [number, number]] = [
      [previous.x, previous.y],
      [point.x, point.y],
    ]
    if (distanceToLine([x, y], line) <= radius + point.width / 2) return true
    previous = point
  }
  return false
}

// Promień poprowadzony od punktu w prawo przecina brzeg wielokąta nieparzystą liczbę razy
// wtedy i tylko wtedy, gdy punkt leży w środku.
function inside(x: number, y: number, polygon: Point[]): boolean {
  let result = false
  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length]!
    if (a.y > y !== b.y > y && x < a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y)) result = !result
  })
  return result
}

/** Kreska jest w obrysie lassa, gdy leży w nim co najmniej połowa jej punktów. */
export function insideLasso(stroke: Stroke, lasso: Point[]): boolean {
  const count = stroke.points.filter((point) => inside(point.x, point.y, lasso)).length
  return count > 0 && count * 2 >= stroke.points.length
}
