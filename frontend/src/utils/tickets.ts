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

/** The lowest price among exams that are already on sale. */
export function cheapestTicket(exams: readonly Exam[]): TicketOffer | undefined {
  let cheapest: TicketOffer | undefined
  for (const exam of exams) {
    if (exam.soon) continue
    for (const kind of ['monthly', 'annual'] as const) {
      const price = exam.prices[kind]
      if (!cheapest || price < cheapest.price) cheapest = { exam, kind, price }
    }
  }
  return cheapest
}

const priceFormat = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
})

export function formatPrice(price: number): string {
  return priceFormat.format(price)
}
