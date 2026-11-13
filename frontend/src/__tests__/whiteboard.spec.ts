import { describe, expect, it } from 'vitest'
import { drawStroke, drawStrokes, insideLasso, lineWidth, touches, type Stroke } from '@/whiteboard'

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
    lineDashOffset: 0,
    dash: [] as number[],
    setLineDash: (dash: number[]) => (context.dash = dash),
    beginPath: () => calls.push('beginPath'),
    moveTo: (x: number, y: number) => calls.push(`moveTo ${x} ${y}`),
    lineTo: (x: number, y: number) => calls.push(`lineTo ${x} ${y}`),
    stroke: () =>
      calls.push(
        context.dash.length
          ? `stroke ${context.lineWidth} dash ${context.lineDashOffset}`
          : `stroke ${context.lineWidth}`,
      ),
    arc: (x: number, y: number, radius: number) => calls.push(`arc ${x} ${y} ${radius}`),
    fill: () => calls.push('fill'),
  }
  return { context: context as unknown as CanvasRenderingContext2D, calls, raw: context }
}

describe('lineWidth', () => {
  it('keeps an even line for a finger and a mouse', () => {
    expect(lineWidth(2, 'touch', 0.5)).toBe(2)
    expect(lineWidth(6, 'mouse', 0)).toBe(6)
  })

  it('makes the line thicker when the stylus presses harder', () => {
    expect(lineWidth(2, 'pen', 1)).toBeGreaterThan(lineWidth(2, 'pen', 0.2))
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

  it('continues the dash pattern from one segment to the next', () => {
    const { context, calls } = recordingContext()
    const points = [
      { x: 0, y: 0, width: 2 },
      { x: 3, y: 4, width: 2 },
      { x: 9, y: 12, width: 2 },
    ]

    drawStroke(context, { tool: 'line', dashed: true, points }, '#000')

    expect(calls.filter((call) => call.startsWith('stroke'))).toEqual([
      'stroke 2 dash 0',
      'stroke 2 dash 5',
    ])
  })

  it('draws only the new segments while writing', () => {
    const { context, calls } = recordingContext()
    const points = [
      { x: 0, y: 0, width: 2 },
      { x: 10, y: 0, width: 2 },
      { x: 20, y: 0, width: 2 },
    ]

    drawStroke(context, { tool: 'pen', points }, '#000', 2)

    expect(calls).toEqual(['beginPath', 'moveTo 10 0', 'lineTo 20 0', 'stroke 2'])
  })

  it('draws a single tap as a dot', () => {
    const { context, calls } = recordingContext()

    drawStroke(context, { tool: 'pen', points: [{ x: 4, y: 6, width: 6 }] }, '#000')

    expect(calls).toEqual(['beginPath', 'arc 4 6 3', 'fill'])
  })

  it('draws with its own colour when the stroke has one', () => {
    const { context } = recordingContext()

    drawStroke(context, { tool: 'pen', color: '#d92d20', points: [{ x: 1, y: 1, width: 2 }] }, '#000')

    expect(context.fillStyle).toBe('#d92d20')
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

describe('touches', () => {
  const line: Stroke = { tool: 'line', points: [{ x: 0, y: 0, width: 2 }, { x: 100, y: 0, width: 2 }] }

  it('catches a straight line in the middle, far from its two points', () => {
    expect(touches(line, 50, 8, 10)).toBe(true)
    expect(touches(line, 50, 30, 10)).toBe(false)
  })
})

describe('insideLasso', () => {
  const square = [
    { x: 0, y: 0, width: 1 },
    { x: 100, y: 0, width: 1 },
    { x: 100, y: 100, width: 1 },
    { x: 0, y: 100, width: 1 },
  ]
  const stroke = (xs: number[]): Stroke => ({
    tool: 'pen',
    points: xs.map((x) => ({ x, y: 50, width: 2 })),
  })

  it('takes a stroke when at least half of it is inside', () => {
    expect(insideLasso(stroke([10, 50, 150, 200]), square)).toBe(true)
    expect(insideLasso(stroke([10, 150, 200]), square)).toBe(false)
  })
})