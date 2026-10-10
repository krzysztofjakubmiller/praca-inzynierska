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
      'Ćwiczysz typy zadań z egzaminu ósmoklasisty. Na mapie tematów widzisz, co już umiesz, a w codziennych powtórkach wracasz do zadań, które sprawiały kłopot.',
    ticketDescription: 'Zadania z egzaminu ósmoklasisty z mapą tematów i codziennymi powtórkami.',
    prices: { monthly: 39, annual: 269 },
  },
  {
    id: 'matura-podstawowa',
    name: 'Matura podstawowa',
    shortName: 'Podstawa',
    solid: 'tetrahedron',
    description:
      'Mapa tematów pokazuje, od czego zacząć. Do przerobionych zadań wracasz w codziennych powtórkach, zanim je zapomnisz.',
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
      'Zadanie otwarte rozwiązujesz w zeszycie, a aplikacja przechodzi z tobą przez kolejne punkty schematu oceniania. Gdy utkniesz, dostajesz podpowiedź do następnego kroku.',
    ticketDescription:
      'Mapa tematów matury rozszerzonej, powtórki, arkusze i zadania otwarte sprawdzane punkt po punkcie.',
    prices: { monthly: 59, annual: 379 },
  },
]
