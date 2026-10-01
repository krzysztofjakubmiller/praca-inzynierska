import { describe, it, expect } from 'vitest'

import { stationPath } from '@/maps/shapes'
import type { Difficulty } from '@/maps/types'

function numbersAfter(command: string, path: string): number[] {
  const match = new RegExp(`${command} ([-\\d.]+) ([-\\d.]+)`).exec(path)
  return match ? [Number(match[1]), Number(match[2])] : []
}

describe('stationPath', () => {
  const center = { x: 10, y: 20 }

  it.each<Difficulty>([0, 1, 2, 3])('starts shape %i at twelve o’clock', (difficulty) => {
    const [x, y] = numbersAfter('M', stationPath(difficulty, center, 8))
    expect(x).toBe(10)
    expect(y).toBeLessThan(20)
  })

  it.each<Difficulty>([1, 2, 3])('goes clockwise around shape %i', (difficulty) => {
    const [x] = numbersAfter('L', stationPath(difficulty, center, 8))
    expect(x).toBeGreaterThan(10)
  })
})
