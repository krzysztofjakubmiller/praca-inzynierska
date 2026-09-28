import { describe, it, expect } from 'vitest'

import { stationPosition } from '@/composables/useStationProgress'

describe('stationPosition', () => {
  it('is -1 before the first stop reaches the reading line', () => {
    expect(stationPosition([120, 520, 920], [400, 400, 400])).toBe(-1)
  })

  it('counts the part of the current stop already passed', () => {
    expect(stationPosition([-300, -50, 400], [250, 100, 300])).toBe(1.5)
  })

  it('stops at the end of the last stop', () => {
    expect(stationPosition([-900, -600, -400], [300, 200, 100])).toBe(3)
  })
})
