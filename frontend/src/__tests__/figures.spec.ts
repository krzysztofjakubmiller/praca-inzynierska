import { describe, expect, it } from 'vitest'
import { withSharedRange, type NumberLineFigure } from '@/figures'

function axis(changes: Partial<NumberLineFigure>): NumberLineFigure {
  return { type: 'os-liczbowa', min: -11, max: 4, ...changes }
}

describe('withSharedRange', () => {
  it('gives all number lines of a task one range, three ticks beyond the outermost numbers', () => {
    const figures = withSharedRange({
      A: axis({ labels: [0, 1, 3], intervals: [{ to: 3, to_closed: true }] }),
      D: axis({ min: -10, max: 9, labels: [-9, 0, 1], intervals: [{ from: -9 }] }),
      content: { type: 'nieznany' },
    })

    expect(figures.A).toMatchObject({ min: -12, max: 6 })
    expect(figures.D).toMatchObject({ min: -12, max: 6 })
    expect(figures.content).toEqual({ type: 'nieznany' })
  })

  it('keeps the range of a number line without any numbers', () => {
    expect(withSharedRange({ content: axis({}) }).content).toMatchObject({ min: -11, max: 4 })
  })
})
