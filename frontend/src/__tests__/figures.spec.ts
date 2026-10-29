import { describe, expect, it } from 'vitest'
import {
  clearestSpot,
  coordinatePlaneSpan,
  numberLineRange,
  spotsAround,
  spotsBeside,
  throughPoints,
} from '@/figures'

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

describe('throughPoints', () => {
  it('gives the line through two points and the parabola through three', () => {
    const line = throughPoints([
      [-2, 0],
      [0, -4],
    ])
    const parabola = throughPoints([
      [-1, 9],
      [0, 8],
      [2, 0],
    ])

    expect(line(1)).toBeCloseTo(-6)
    expect(parabola(-4)).toBeCloseTo(0)
    expect(parabola(-1)).toBeCloseTo(9)
  })
})

describe('clearestSpot', () => {
  it('puts the label in the widest gap between the lines', () => {
    // Linie w prawo i w górę, więc najwięcej miejsca jest w lewo w dół.
    const [x, y] = clearestSpot(spotsAround([0, 0], [5, -5], 10), [
      [
        [0, 0],
        [10, 0],
      ],
      [
        [0, 0],
        [0, -10],
      ],
    ])

    expect(x).toBeLessThan(0)
    expect(y).toBeGreaterThan(0)
  })

  it('avoids a line that only passes through the point', () => {
    // Pozioma prosta przez punkt: napis nie może stanąć ani w lewo, ani w prawo.
    const [, y] = clearestSpot(spotsAround([0, 0], [10, 0], 10), [
      [
        [-20, 0],
        [20, 0],
      ],
    ])

    expect(Math.abs(y)).toBeGreaterThan(9)
  })

  it('moves a segment label off another line crossing its middle', () => {
    const middle = spotsBeside([0, 0], [20, 0], [10, -10], 8)
    const crossing: [[number, number], [number, number]] = [
      [10, -20],
      [10, 20],
    ]

    const [x] = clearestSpot(middle, [crossing])

    expect(Math.abs(x - 10)).toBeGreaterThan(2)
  })
})

describe('coordinatePlaneSpan', () => {
  it('takes the widest range of all coordinate planes of a task', () => {
    expect(
      coordinatePlaneSpan([
        { type: 'uklad-wspolrzednych', x: [-4, 4], y: [-4, 4] },
        { type: 'uklad-wspolrzednych', x: [-1, 10], y: [-1, 3] },
        { type: 'nieznany' },
      ]),
    ).toEqual({ x: 11, y: 8 })
  })
})
