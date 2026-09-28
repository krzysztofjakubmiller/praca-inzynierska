import { describe, it, expect } from 'vitest'

import { EXAMS, type Exam } from '@/config/exams'
import { cheapestTicket, formatPrice } from '@/utils/tickets'

function exam(overrides: Partial<Exam>): Exam {
  return { ...EXAMS[1]!, ...overrides }
}

describe('cheapestTicket', () => {
  it('picks the lowest price of both ticket kinds', () => {
    const cheap = exam({ id: 'matura-rozszerzona', prices: { monthly: 60, annual: 30 } })
    const cheapest = cheapestTicket([exam({ prices: { monthly: 40, annual: 300 } }), cheap])
    expect(cheapest).toEqual({ exam: cheap, kind: 'annual', price: 30 })
  })

  it('skips exams that are not on sale yet', () => {
    const cheapest = cheapestTicket([
      exam({ id: 'e8', soon: true, prices: { monthly: 1, annual: 2 } }),
      exam({ prices: { monthly: 49, annual: 309 } }),
    ])
    expect(cheapest?.price).toBe(49)
  })

  it('returns nothing when no exam is on sale', () => {
    expect(cheapestTicket([exam({ soon: true })])).toBeUndefined()
  })
})

describe('formatPrice', () => {
  it('shows whole zloty', () => {
    expect(formatPrice(49)).toBe('49 zł')
  })
})
