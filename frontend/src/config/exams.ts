export type SolidKind = 'sphere' | 'tetrahedron' | 'cube'

export interface Exam {
  /** Anchor of the station section and suffix of the `--exam-*` colour token. */
  id: 'e8' | 'matura-podstawowa' | 'matura-rozszerzona'
  name: string
  shortName: string
  solid: SolidKind
  description: string
  ticketDescription: string
  /** Prices in zloty. */
  prices: { monthly: number; annual: number }
}

// The price list is not decided yet, so these are placeholders ending in 9.
export const EXAMS: readonly Exam[] = [
  {
    id: 'e8',
    name: 'Egzamin ósmoklasisty',
    shortName: 'E8',
    solid: 'sphere',
    description:
      'Przygotowanie do egzaminu ósmoklasisty bez wkuwania. Ćwiczysz typy zadań z egzaminu, a każda powtórka ma nowe liczby, więc uczysz się sposobu, a nie wyniku.',
    ticketDescription: 'Zadania z egzaminu ósmoklasisty z mapą tematów i codziennymi powtórkami.',
    prices: { monthly: 39, annual: 269 },
  },
  {
    id: 'matura-podstawowa',
    name: 'Matura podstawowa',
    shortName: 'Podstawa',
    solid: 'tetrahedron',
    description:
      'Mapa tematów podpowie, od czego zacząć, a codzienne powtórki wrócą do każdego typu zadania, zanim zdążysz go zapomnieć.',
    ticketDescription:
      'Mapa tematów matury podstawowej, codzienne powtórki, arkusze i asystent przy zadaniach.',
    prices: { monthly: 49, annual: 309 },
  },
  {
    id: 'matura-rozszerzona',
    name: 'Matura rozszerzona',
    shortName: 'Rozszerzona',
    solid: 'cube',
    description:
      'Zadanie otwarte rozwiązujesz w zeszycie, a aplikacja przechodzi z tobą przez kolejne punkty schematu oceniania. Gdy utkniesz, podpowie zamiast podać gotowca.',
    ticketDescription:
      'Mapa tematów matury rozszerzonej, powtórki, arkusze i zadania otwarte sprawdzane punkt po punkcie.',
    prices: { monthly: 59, annual: 379 },
  },
]

/** Annual tickets bought for the 2027 exams expire on this day. */
export const ANNUAL_TICKET_VALID_UNTIL = '2027-08-31'
