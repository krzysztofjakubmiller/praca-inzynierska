import type { Exam } from '@/config/exams'

export type TicketKind = 'monthly' | 'annual'

export interface TicketOffer {
  exam: Exam
  kind: TicketKind
  price: number
}

export const TICKET_NAMES: Record<TicketKind, string> = {
  monthly: 'Bilet miesięczny',
  annual: 'Bilet roczny',
}

/** Najniższa cena spośród wszystkich biletów na wszystkie egzaminy. */
export function cheapestTicket(exams: readonly Exam[]): TicketOffer | undefined {
  let cheapest: TicketOffer | undefined
  for (const exam of exams) {
    for (const kind of ['monthly', 'annual'] as const) {
      const price = exam.prices[kind]
      if (!cheapest || price < cheapest.price) cheapest = { exam, kind, price }
    }
  }
  return cheapest
}

/**
 * Ostatni dzień ważności biletu rocznego kupionego danego dnia: najbliższy 31 sierpnia.
 * Od września sprzedajemy już bilet na egzaminy w następnym roku.
 */
export function annualTicketEnd(today: Date): Date {
  const year = today.getMonth() >= 8 ? today.getFullYear() + 1 : today.getFullYear()
  return new Date(year, 7, 31)
}

const priceFormat = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
})

export function formatPrice(price: number): string {
  return priceFormat.format(price)
}
