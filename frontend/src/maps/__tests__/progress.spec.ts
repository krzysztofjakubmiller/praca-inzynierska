import { describe, it, expect } from 'vitest'

import { effectiveness, passengerCount, progressShare, topicState } from '@/maps/progress'
import type { TopicProgress } from '@/maps/types'

function topic(done: number, total: number, due = 0, attempts = 0, correct = 0): TopicProgress {
  return { total, done, due, recent: { attempts, correct } }
}

describe('progressShare', () => {
  it('is empty for an untouched topic', () => {
    expect(progressShare(undefined)).toBe(0)
    expect(progressShare(topic(0, 20))).toBe(0)
  })

  it('counts done tasks out of all tasks of the topic', () => {
    expect(progressShare(topic(18, 40))).toBe(0.45)
    expect(progressShare(topic(40, 40))).toBe(1)
  })

  it('stays between 0 and 1 for odd data', () => {
    expect(progressShare(topic(25, 20))).toBe(1)
    expect(progressShare(topic(3, 0))).toBe(0)
  })
})

describe('passengerCount', () => {
  it('shows nobody when nothing waits for a review', () => {
    expect(passengerCount(undefined)).toBe(0)
    expect(passengerCount(topic(20, 40, 0))).toBe(0)
  })

  it('shows one passenger for every started quarter of done tasks waiting', () => {
    expect(passengerCount(topic(40, 40, 1))).toBe(1)
    expect(passengerCount(topic(40, 40, 10))).toBe(1)
    expect(passengerCount(topic(40, 40, 11))).toBe(2)
    expect(passengerCount(topic(40, 40, 30))).toBe(3)
    expect(passengerCount(topic(40, 40, 31))).toBe(4)
  })

  it('shows one passenger per waiting task when at most four tasks are done', () => {
    expect(passengerCount(topic(1, 40, 1))).toBe(1)
    expect(passengerCount(topic(3, 40, 1))).toBe(1)
    expect(passengerCount(topic(3, 40, 3))).toBe(3)
    expect(passengerCount(topic(4, 40, 2))).toBe(2)
  })

  it('never shows more than four passengers or more than done tasks', () => {
    expect(passengerCount(topic(10, 40, 10))).toBe(4)
    expect(passengerCount(topic(10, 40, 25))).toBe(4)
    expect(passengerCount(topic(2, 40, 5))).toBe(2)
  })
})

describe('effectiveness', () => {
  it('counts the correct ones among the recent variants', () => {
    expect(effectiveness(topic(1, 20, 0, 1, 1))).toBe(1)
    expect(effectiveness(topic(9, 20, 0, 14, 10))).toBeCloseTo(0.714, 3)
  })

  it('is unknown before the first variant', () => {
    expect(effectiveness(undefined)).toBeUndefined()
    expect(effectiveness(topic(0, 20))).toBeUndefined()
  })
})

describe('topicState', () => {
  it('tells untouched, weak, learning and mastered topics apart', () => {
    expect(topicState(undefined)).toBe('untouched')
    expect(topicState(topic(12, 36, 7, 12, 5))).toBe('weak')
    expect(topicState(topic(21, 30, 0, 20, 13))).toBe('learning')
    expect(topicState(topic(24, 24, 2, 20, 18))).toBe('mastered')
    expect(topicState(topic(24, 24, 2, 20, 15))).toBe('learning')
  })

  it('does not judge a topic after fewer than five variants', () => {
    expect(topicState(topic(3, 18, 0, 3, 0))).toBe('learning')
    expect(topicState(topic(4, 4, 0, 4, 4))).toBe('learning')
  })
})
