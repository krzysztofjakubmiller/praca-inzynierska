import { EXAMS } from '@/config/exams'
import { annualTicketEnd, annualTicketMonths, cheapestTicket } from '@/utils/tickets'

/** Dane biletów liczone z dzisiejszej daty, wspólne dla wszystkich wariantów wizytówki. */
export function useOffer() {
  const today = new Date()
  const annualEnd = annualTicketEnd(today)
  return {
    today,
    year: today.getFullYear(),
    cheapest: cheapestTicket(EXAMS),
    annualMonths: annualTicketMonths(today, annualEnd),
    validUntil: new Intl.DateTimeFormat('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(annualEnd),
  }
}
