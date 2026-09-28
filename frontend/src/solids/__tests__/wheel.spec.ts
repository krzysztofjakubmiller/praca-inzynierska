import { describe, it, expect } from 'vitest'

import { edgePhase, stairPhase, wheelOffset } from '@/solids/wheel'

const LAST = 3

function slope(phase: (position: number) => number, position: number): number {
  const step = 1e-4
  return (phase(position + step) - phase(position - step)) / (2 * step)
}

describe('stairPhase', () => {
  it('rests on the solid of a station at its middle', () => {
    expect(stairPhase(0, LAST)).toBe(0)
    expect(stairPhase(1, LAST)).toBe(1)
    expect(stairPhase(2, LAST)).toBe(2)
  })

  it('is half way between two solids at the border of two stations', () => {
    expect(stairPhase(0.5, LAST)).toBeCloseTo(0.5)
    expect(stairPhase(1.5, LAST)).toBeCloseTo(1.5)
  })

  it('drifts slowly while a station is read and turns fast between stations', () => {
    const phase = (position: number) => stairPhase(position, LAST)
    expect(slope(phase, 1)).toBeLessThan(0.2)
    expect(slope(phase, 1.5)).toBeGreaterThan(3)
  })

  it('never turns back and never jumps', () => {
    let previous = stairPhase(-2, LAST)
    for (let position = -2; position <= 4; position += 0.001) {
      const current = stairPhase(position, LAST)
      expect(current).toBeGreaterThanOrEqual(previous)
      expect(current - previous).toBeLessThan(0.01)
      previous = current
    }
  })

  it('keeps the first solid still before the first station and stops after the last', () => {
    expect(stairPhase(-1, LAST)).toBe(0)
    expect(stairPhase(10, LAST)).toBe(LAST)
  })
})

describe('edgePhase', () => {
  it('rests in the middle of the screen', () => {
    expect(edgePhase(0)).toBe(0)
  })

  it('is half a step away at either edge of the screen', () => {
    expect(edgePhase(1)).toBeCloseTo(0.5)
    expect(edgePhase(-1)).toBeCloseTo(-0.5)
    expect(edgePhase(2)).toBeCloseTo(0.5)
  })

  it('is symmetric', () => {
    expect(edgePhase(-0.7)).toBeCloseTo(-edgePhase(0.7))
  })
})

describe('wheelOffset', () => {
  it('leaves a resting solid in place', () => {
    const offset = wheelOffset(0, 100)
    expect(offset.x).toBeCloseTo(0)
    expect(offset.y).toBeCloseTo(0)
  })

  it('brings a coming solid from below right and takes a gone one away up right', () => {
    expect(wheelOffset(0.5, 100).y).toBeGreaterThan(0)
    expect(wheelOffset(-0.5, 100).y).toBeLessThan(0)
    expect(wheelOffset(0.5, 100).x).toBeGreaterThan(0)
    expect(wheelOffset(-0.5, 100).x).toBeGreaterThan(0)
  })
})
