import { EXAMS } from '@/config/exams'
import { DEMO_REVIEW_LIMIT, DEMO_TARGET, demoProgressStats } from '@/stats/demoStats'
import { currentStreak, daysBetween, longDate, plural, shiftDay } from '@/stats/stats'
import { TICKET_NAMES, formatPrice } from '@/utils/tickets'

// Wymyślony uczeń do wersji konta pod /konto2. Postęp jest ten sam co na stronie demo, więc
// wykresy pokazują prawdziwe komponenty z sensownymi liczbami. Bilet jest zmyślony: konto
// jeszcze go nie pokazuje.
export const EMAIL = 'ola.nowak@przyklad.pl'
export const EXAM = EXAMS.find((exam) => exam.id === 'matura-podstawowa')!
export const STATS = demoProgressStats(EXAM.id)
export const TARGET = DEMO_TARGET
export const LIMIT = DEMO_REVIEW_LIMIT

export const DAYS_LEFT = daysBetween(STATS.today, STATS.examDate)
export const DAYS_LEFT_TEXT = `${DAYS_LEFT} ${plural(DAYS_LEFT, 'dzień', 'dni', 'dni')}`
export const EXAM_DATE = longDate(STATS.examDate)
export const STREAK = currentStreak(STATS.days)
export const STREAK_TEXT = `${STREAK} ${plural(STREAK, 'dzień', 'dni', 'dni')}`
// Powtórek na dziś bywa więcej niż dzienny limit; uczeń dostaje najwyżej tyle, ile wynosi limit.
export const REVIEWS_TODAY = Math.min(STATS.reviewsAhead[0] ?? 0, LIMIT)
export const REVIEWS_TODAY_TEXT = `${REVIEWS_TODAY} ${plural(REVIEWS_TODAY, 'powtórka', 'powtórki', 'powtórek')}`
export const WEEK_TASKS = STATS.days.slice(-7).reduce((sum, tasks) => sum + tasks, 0)
export const SCORE = Math.round(STATS.recentScore * 100)
export const LAST_SHEET = [...STATS.sheets]
  .reverse()
  .find((sheet) => sheet.percent !== undefined)?.percent
export const NEXT_SHEET = STATS.sheets.find((sheet) => sheet.percent === undefined)

// Bilet miesięczny kupiony tydzień temu, a przed nim poprzedni, też miesięczny.
const TICKET_DAYS = 23
export const TICKET = {
  name: TICKET_NAMES.monthly,
  price: `${formatPrice(EXAM.prices.monthly)} miesięcznie`,
  until: longDate(shiftDay(STATS.today, TICKET_DAYS)),
  left: `${TICKET_DAYS} ${plural(TICKET_DAYS, 'dzień', 'dni', 'dni')}`,
}
export const PAYMENTS = [7, 37].map((daysAgo) => ({
  date: longDate(shiftDay(STATS.today, -daysAgo)),
  name: TICKET_NAMES.monthly,
  amount: formatPrice(EXAM.prices.monthly),
}))

// Odcinek trasy od początku roku szkolnego do matury, jak w odliczaniu na obecnym profilu.
export const ROUTE_START = `${Number(STATS.examDate.slice(0, 4)) - 1}-09-01`
export const TRAVELLED = Math.min(
  1,
  Math.max(0, daysBetween(ROUTE_START, STATS.today) / daysBetween(ROUTE_START, STATS.examDate)),
)

export const TABS = [
  { id: 'profil', label: 'Profil' },
  { id: 'postep', label: 'Postęp' },
  { id: 'ustawienia', label: 'Ustawienia' },
] as const

// Wersja 1 ma jeszcze zakładkę z biletem i historią płatności.
export const TABS_WITH_PAYMENTS = [
  TABS[0],
  TABS[1],
  { id: 'platnosci', label: 'Płatności' },
  TABS[2],
] as const

export type Tab = (typeof TABS_WITH_PAYMENTS)[number]['id']
