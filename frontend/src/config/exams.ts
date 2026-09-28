export type SolidKind = 'sphere' | 'tetrahedron' | 'cube'

export interface Exam {
  /** Kotwica sekcji stacji i końcówka nazwy koloru `--exam-*`. */
  id: 'e8' | 'matura-podstawowa' | 'matura-rozszerzona'
  name: string
  shortName: string
  solid: SolidKind
  description: string
  ticketDescription: string
  /** Ceny w złotych. */
  prices: { monthly: number; annual: number }
}

// Cennik nie jest jeszcze ustalony, to ceny zastępcze z końcówką 9.
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

/** Dzień, w którym wygasają bilety roczne na egzaminy w 2027 roku. */
export const ANNUAL_TICKET_VALID_UNTIL = '2027-08-31'
