import { describe, expect, it } from 'vitest'
import { numberLineRange } from '@/figures'

describe('numberLineRange', () => {
  it('gives all number lines of a task one range, three ticks beyond the outermost numbers', () => {
    const range = numberLineRange([
      { type: 'os-liczbowa', labels: [0, 1, 3], intervals: [{ to: 3, to_closed: true }] },
      { type: 'os-liczbowa', labels: [-9, 0, 1], intervals: [{ from: -9 }] },
      { type: 'nieznany' },
    ])

    expect(range).toEqual({ min: -12, max: 6 })
  })

  it('centers a number line without numbers on zero', () => {
    expect(numberLineRange([{ type: 'os-liczbowa' }])).toEqual({ min: -3, max: 3 })
  })
})
