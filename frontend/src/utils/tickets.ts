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

/** Na ile miesięcy wystarcza bilet roczny kupiony danego dnia (co najmniej na jeden). */
export function annualTicketMonths(today: Date, end: Date): number {
  const days = (end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  return Math.max(1, Math.round(days / (365 / 12)))
}

/**
 * Średnia cena biletu rocznego za miesiąc (w dół do pełnych złotych) i oszczędność względem
 * kupowania biletu miesięcznego przez ten sam czas.
 */
export function annualTicketValue(
  prices: Exam['prices'],
  months: number,
): { perMonth: number; saving: number } {
  return {
    perMonth: Math.floor(prices.annual / months),
    saving: prices.monthly * months - prices.annual,
  }
}

const priceFormat = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
})

export function formatPrice(price: number): string {
  return priceFormat.format(price)
}
