import { describe, expect, it } from 'vitest'
import { BASIC_MAP, EXTENDED_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import { dueTotal } from '@/maps/nextStep'
import type { TopicMap } from '@/maps/types'
import { demoProgressStats } from '@/stats/demoStats'
import {
  currentStreak,
  daysBetween,
  lineStats,
  longestStreak,
  plural,
  shiftDay,
  topicStates,
  weakestTopics,
} from '@/stats/stats'

// Dwie linie z przesiadką „b”: jej zadania liczą się tylko na pierwszej linii.
const SMALL_MAP: TopicMap = {
  examId: 'matura-podstawowa',
  graph: {
    stations: {
      a: { name: 'A', difficulty: 0, description: '' },
      b: { name: 'B', difficulty: 1, description: '' },
      c: { name: 'C', difficulty: 2, description: '' },
    },
    lines: [
      { id: 'pierwsza', name: 'Pierwsza', color: 1, stations: ['a', 'b'] },
      { id: 'druga', name: 'Druga', color: 2, stations: ['b', 'c'] },
    ],
  },
  layout: { points: { a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, c: { x: 2, y: 0 } } },
}

const SMALL_PROGRESS = {
  topics: {
    a: { total: 10, done: 10, due: 0, recent: { attempts: 10, correct: 9 } },
    b: { total: 20, done: 5, due: 2, recent: { attempts: 6, correct: 2 } },
  },
}

describe('lineStats', () => {
  it('counts a transfer station only on its first line', () => {
    expect(lineStats(SMALL_MAP, SMALL_PROGRESS, { a: 10, b: 20, c: 30 })).toEqual([
      { name: 'Pierwsza', color: 1, total: 30, done: 15 },
      { name: 'Druga', color: 2, total: 30, done: 0 },
    ])
  })
})

describe('topicStates', () => {
  it('counts every topic once', () => {
    expect(topicStates(SMALL_MAP, SMALL_PROGRESS)).toEqual({
      mastered: 1,
      learning: 0,
      weak: 1,
      untouched: 1,
    })
  })
})

describe('weakestTopics', () => {
  it('starts with the lowest score and skips topics without one', () => {
    expect(weakestTopics(SMALL_MAP, SMALL_PROGRESS).map((topic) => topic.name)).toEqual(['B', 'A'])
  })
})

describe('streaks', () => {
  it('counts the current streak even before learning today', () => {
    expect(currentStreak([3, 0, 2, 4, 0])).toBe(2)
    expect(currentStreak([3, 0, 2, 4, 1])).toBe(3)
    expect(currentStreak([3, 0, 0])).toBe(0)
  })

  it('finds the longest streak', () => {
    expect(longestStreak([1, 1, 0, 1, 1, 1, 0])).toBe(3)
  })
})

describe('dates', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-10-16', '2027-05-05')).toBe(201)
  })

  it('moves a date by days', () => {
    expect(shiftDay('2026-12-30', 3)).toBe('2027-01-02')
  })
})

describe('plural', () => {
  it.each([
    [1, 'dzień'],
    [2, 'dni'],
    [5, 'dni'],
  ])('%i %s', (count, word) => {
    expect(plural(count, 'dzień', 'dni', 'dni')).toBe(word)
  })

  it.each([
    [1, 'zadanie'],
    [3, 'zadania'],
    [12, 'zadań'],
    [22, 'zadania'],
    [25, 'zadań'],
  ])('%i %s', (count, word) => {
    expect(plural(count, 'zadanie', 'zadania', 'zadań')).toBe(word)
  })
})

describe('demo statistics', () => {
  it('agree with the demo map', () => {
    const stats = demoProgressStats('matura-podstawowa')

    expect(stats.reviewsAhead[0]).toBe(dueTotal(BASIC_DEMO_PROGRESS))
    expect(stats.lines.map((line) => line.name)).toEqual(
      BASIC_MAP.graph.lines.map((line) => line.name),
    )
    const topics = Object.values(stats.states).reduce((sum, count) => sum + count, 0)
    expect(topics).toBe(Object.keys(BASIC_MAP.graph.stations).length)
  })

  it('cover 20 weeks and the next two weeks of reviews', () => {
    const stats = demoProgressStats('matura-rozszerzona')

    expect(stats.days).toHaveLength(140)
    expect(stats.reviewsAhead).toHaveLength(14)
    expect(stats.lines).toHaveLength(EXTENDED_MAP.graph.lines.length)
  })
})
