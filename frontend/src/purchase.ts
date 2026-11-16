import type { LocationQuery, RouteLocationRaw } from 'vue-router'
import { loadAccount } from '@/account'
import { EXAMS, type Exam } from '@/config/exams'
import type { TicketKind } from '@/utils/tickets'

// Zakup biletu zaczyna się na wizytówce. Wybrany egzamin i okres jadą w adresie przez
// logowanie aż do strony płatności.
const PERIODS: Record<TicketKind, string> = { monthly: 'miesieczny', annual: 'roczny' }

export function readPurchase(query: LocationQuery): { exam?: Exam; kind: TicketKind } {
  return {
    exam: EXAMS.find((item) => item.id === query.egzamin),
    kind: query.okres === PERIODS.annual ? 'annual' : 'monthly',
  }
}

/** Zalogowany trafia od razu do płatności, a niezalogowany najpierw na logowanie. */
export async function purchaseRoute(exam: Exam['id'], kind: TicketKind): Promise<RouteLocationRaw> {
  const account = await loadAccount().catch(() => null)
  return { name: account ? 'payment' : 'login', query: { egzamin: exam, okres: PERIODS[kind] } }
}
