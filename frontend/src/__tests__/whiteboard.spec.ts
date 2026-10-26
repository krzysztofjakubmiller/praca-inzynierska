import { describe, expect, it } from 'vitest'
import { drawStroke, drawStrokes, lineWidth, THICK, THIN, type Stroke } from '@/whiteboard'

// Atrapa kontekstu płótna, która zapisuje wywołania; jsdom nie ma prawdziwego płótna.
function recordingContext() {
  const calls: string[] = []
  const context = {
    globalCompositeOperation: 'source-over',
    strokeStyle: '',
    fillStyle: '',
    lineCap: '',
    lineJoin: '',
    lineWidth: 0,
    beginPath: () => calls.push('beginPath'),
    moveTo: (x: number, y: number) => calls.push(`moveTo ${x} ${y}`),
    lineTo: (x: number, y: number) => calls.push(`lineTo ${x} ${y}`),
    stroke: () => calls.push(`stroke ${context.lineWidth}`),
    arc: (x: number, y: number, radius: number) => calls.push(`arc ${x} ${y} ${radius}`),
    fill: () => calls.push('fill'),
  }
  return { context: context as unknown as CanvasRenderingContext2D, calls, raw: context }
}

describe('lineWidth', () => {
  it('keeps an even line for a finger and a mouse', () => {
    expect(lineWidth(THIN, 'pen', 'touch', 0.5)).toBe(THIN)
    expect(lineWidth(THICK, 'pen', 'mouse', 0)).toBe(THICK)
  })

  it('makes the line thicker when the stylus presses harder', () => {
    expect(lineWidth(THIN, 'pen', 'pen', 1)).toBeGreaterThan(lineWidth(THIN, 'pen', 'pen', 0.2))
  })

  it('gives the eraser a wider tip than the pen', () => {
    expect(lineWidth(THIN, 'eraser', 'touch', 0.5)).toBeGreaterThan(THIN)
  })
})

describe('drawStroke', () => {
  it('draws one segment between each pair of points with their width', () => {
    const { context, calls } = recordingContext()
    const stroke: Stroke = {
      tool: 'pen',
      points: [
        { x: 0, y: 0, width: 2 },
        { x: 10, y: 5, width: 3 },
        { x: 20, y: 5, width: 4 },
      ],
    }

    drawStroke(context, stroke, '#1d1f22')

    expect(calls).toEqual([
      'beginPath',
      'moveTo 0 0',
      'lineTo 10 5',
      'stroke 3',
      'beginPath',
      'moveTo 10 5',
      'lineTo 20 5',
      'stroke 4',
    ])
    expect(context.strokeStyle).toBe('#1d1f22')
  })

  it('draws a single tap as a dot', () => {
    const { context, calls } = recordingContext()

    drawStroke(context, { tool: 'pen', points: [{ x: 4, y: 6, width: 6 }] }, '#000')

    expect(calls).toEqual(['beginPath', 'arc 4 6 3', 'fill'])
  })

  it('erases pixels instead of painting with the eraser', () => {
    const { context, raw } = recordingContext()
    const seen: string[] = []
    raw.stroke = () => seen.push(raw.globalCompositeOperation)
    const eraser: Stroke = {
      tool: 'eraser',
      points: [
        { x: 0, y: 0, width: 8 },
        { x: 5, y: 5, width: 8 },
      ],
    }

    drawStrokes(context, [eraser], '#000')

    expect(seen).toEqual(['destination-out'])
    expect(raw.globalCompositeOperation).toBe('source-over')
  })
})
