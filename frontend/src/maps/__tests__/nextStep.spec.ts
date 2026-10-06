import { describe, it, expect } from 'vitest'

import { BASIC_MAP } from '@/maps'
import { dueTotal, nextStep } from '@/maps/nextStep'
import type { MapProgress } from '@/maps/types'

const today = new Date(2026, 8, 30)
const done = { last: new Date(2026, 8, 1), next: new Date(2026, 9, 15) }

function progress(dues: number[], lastStation?: string): MapProgress<string> {
  const topics = Object.fromEntries(
    dues.map((due, index) => [
      `topic-${index}`,
      { total: 20, done: 10, due, recent: { attempts: 10, correct: 7 } },
    ]),
  )
  return { topics, lastStation }
}

describe('dueTotal', () => {
  it('adds up the reviews waiting in every topic', () => {
    expect(dueTotal(undefined)).toBe(0)
    expect(dueTotal(progress([3, 0, 9]))).toBe(12)
  })
})

describe('nextStep', () => {
  it('starts a new student with the diagnostic sheet', () => {
    expect(nextStep(BASIC_MAP, undefined, {}, today)).toEqual({ kind: 'diagnostic', first: true })
  })

  it('asks for the next diagnostic sheet once its date has come', () => {
    const late = { last: new Date(2026, 7, 1), next: new Date(2026, 8, 29) }
    expect(nextStep(BASIC_MAP, progress([5]), late, today)).toEqual({
      kind: 'diagnostic',
      first: false,
    })
  })

  it('sends the student to reviews when some are waiting', () => {
    expect(nextStep(BASIC_MAP, progress([3, 9]), done, today)).toEqual({
      kind: 'reviews',
      count: 12,
    })
  })

  it('continues the last topic when nothing waits', () => {
    expect(nextStep(BASIC_MAP, progress([0], 'wielomiany'), done, today)).toEqual({
      kind: 'continue',
      stationId: 'wielomiany',
    })
  })

  it('suggests the first topic of the list when the student has not started any', () => {
    expect(nextStep(BASIC_MAP, progress([]), done, today)).toEqual({
      kind: 'continue',
      stationId: 'logarytmy',
    })
  })
})
