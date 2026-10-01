import { describe, it, expect } from 'vitest'

import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'

describe('BASIC_DEMO_PROGRESS', () => {
  it('keeps every count within its whole', () => {
    const problems = Object.entries(BASIC_DEMO_PROGRESS.topics)
      .filter(
        ([, topic]) =>
          !topic ||
          Math.min(topic.done, topic.due, topic.recent.correct) < 0 ||
          topic.done > topic.total ||
          topic.due > topic.done ||
          topic.recent.correct > topic.recent.attempts ||
          topic.recent.attempts > 20,
      )
      .map(([id]) => id)
    expect(problems).toEqual([])
  })

  it('marks a started topic as the last one', () => {
    const last = BASIC_DEMO_PROGRESS.lastStation
    expect(last && BASIC_DEMO_PROGRESS.topics[last]?.done).toBeGreaterThan(0)
  })
})
