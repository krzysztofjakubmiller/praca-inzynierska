export type Tool = 'pen' | 'eraser'

export interface Point {
  x: number
  y: number
  /** Grubość linii w tym punkcie, w pikselach CSS. */
  width: number
}

export interface Stroke {
  tool: Tool
  points: Point[]
}

export const THIN = 2
export const THICK = 6

// Gumka jest szersza od pisaka, bo ściera się nią większe kawałki niż się pisze.
const ERASER_SCALE = 4

/**
 * Grubość linii w punkcie. Rysik podaje nacisk od 0 do 1 i linia grubieje przy mocniejszym
 * docisku; palec i mysz podają stały nacisk, więc rysują równą linią.
 */
export function lineWidth(base: number, tool: Tool, pointerType: string, pressure: number): number {
  const width = tool === 'eraser' ? base * ERASER_SCALE : base
  if (pointerType !== 'pen' || pressure <= 0) return width
  return width * (0.4 + 1.2 * pressure)
}

// Kreska to odcinki między kolejnymi punktami, każdy z grubością swojego punktu, więc zmiana
// nacisku w trakcie kreski jest widoczna. Pojedynczy punkt (stuknięcie) rysuje się jako kropka.
export function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke, color: string) {
  context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  context.strokeStyle = color
  context.fillStyle = color
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
  let previous = first
  for (const point of rest) {
    context.beginPath()
    context.lineWidth = point.width
    context.moveTo(previous.x, previous.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    previous = point
  }
}

export function drawStrokes(context: CanvasRenderingContext2D, strokes: Stroke[], color: string) {
  for (const stroke of strokes) drawStroke(context, stroke, color)
  context.globalCompositeOperation = 'source-over'
}
