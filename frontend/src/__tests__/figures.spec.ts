import { describe, expect, it } from 'vitest'
import { numberLineRange, withSharedRange, type NumberLineFigure } from '@/figures'

function axis(changes: Partial<NumberLineFigure>): NumberLineFigure {
  return { type: 'os-liczbowa', min: -11, max: 4, ...changes }
}

describe('numberLineRange', () => {
  it('leaves two ticks beyond the outermost label or end', () => {
    const figure = axis({ labels: [0, 1, 3], intervals: [{ from: 3, from_closed: true }] })

    expect(numberLineRange(figure)).toEqual({ min: -11, max: 5 })
  })

  it('keeps a range that is already wide enough', () => {
    expect(numberLineRange(axis({ labels: [0] }))).toEqual({ min: -11, max: 4 })
  })
})

describe('withSharedRange', () => {
  it('gives all number lines of a task one range', () => {
    const figures = withSharedRange({
      A: axis({ labels: [0, 1, 3] }),
      C: axis({ min: -10, max: 9, labels: [-9, 0, 1] }),
      content: { type: 'nieznany' },
    })

    expect(figures.A).toMatchObject({ min: -11, max: 9 })
    expect(figures.C).toMatchObject({ min: -11, max: 9 })
    expect(figures.content).toEqual({ type: 'nieznany' })
  })
})
