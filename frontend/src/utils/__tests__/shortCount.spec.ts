import { describe, it, expect } from 'vitest'

import { shortCount } from '@/utils/shortCount'

describe('shortCount', () => {
  it('shows counts up to 99 as they are and caps bigger ones', () => {
    expect(shortCount(7)).toBe('7')
    expect(shortCount(99)).toBe('99')
    expect(shortCount(100)).toBe('99+')
  })
})
