import { describe, it, expect } from 'vitest'

import { EXAMS, type Exam } from '@/config/exams'
import {
  annualTicketEnd,
  annualTicketMonths,
  annualTicketValue,
  cheapestTicket,
  formatPrice,
} from '@/utils/tickets'

function exam(overrides: Partial<Exam>): Exam {
  return { ...EXAMS[1]!, ...overrides }
}

describe('cheapestTicket', () => {
  it('picks the lowest price of both ticket kinds', () => {
    const cheap = exam({ id: 'matura-rozszerzona', prices: { monthly: 60, annual: 30 } })
    const cheapest = cheapestTicket([exam({ prices: { monthly: 40, annual: 300 } }), cheap])
    expect(cheapest).toEqual({ exam: cheap, kind: 'annual', price: 30 })
  })

  it('returns nothing when there are no exams', () => {
    expect(cheapestTicket([])).toBeUndefined()
  })
})

describe('annualTicketEnd', () => {
  it('ends on the coming 31 August before September', () => {
    expect(annualTicketEnd(new Date(2027, 2, 1))).toEqual(new Date(2027, 7, 31))
    expect(annualTicketEnd(new Date(2027, 7, 31))).toEqual(new Date(2027, 7, 31))
  })

  it('ends in the next year from September on', () => {
    expect(annualTicketEnd(new Date(2026, 8, 29))).toEqual(new Date(2027, 7, 31))
  })
})

describe('annualTicketMonths', () => {
  it('counts the months until the ticket ends', () => {
    expect(annualTicketMonths(new Date(2026, 8, 29), new Date(2027, 7, 31))).toBe(11)
  })

  it('counts at least one month', () => {
    expect(annualTicketMonths(new Date(2027, 7, 30), new Date(2027, 7, 31))).toBe(1)
  })
})

describe('annualTicketValue', () => {
  it('rounds the monthly price down and compares with monthly tickets', () => {
    expect(annualTicketValue({ monthly: 39, annual: 269 }, 11)).toEqual({
      perMonth: 24,
      saving: 160,
    })
  })
})

describe('formatPrice', () => {
  it('shows whole zloty', () => {
    expect(formatPrice(49)).toBe('49 zł')
  })
})
