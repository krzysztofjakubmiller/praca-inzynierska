import { describe, it, expect } from 'vitest'

import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import { EXTENDED_DEMO_PROGRESS } from '@/maps/extended/demoProgress'
import type { MapProgress } from '@/maps/types'

describe.each([
  ['basic', BASIC_DEMO_PROGRESS],
  ['extended', EXTENDED_DEMO_PROGRESS],
] as [string, MapProgress<string>][])('the %s demo student', (_, progress) => {
  it('keeps every count within its whole', () => {
    const problems = Object.entries(progress.topics)
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
    const last = progress.lastStation
    expect(last && progress.topics[last]?.done).toBeGreaterThan(0)
  })
})
