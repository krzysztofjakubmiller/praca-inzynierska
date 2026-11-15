import type { Exam } from '@/config/exams'
import { tidy } from '@/landing2/content'
import { BASIC_MAP } from '@/maps'
import { plural } from '@/utils/plural'

// Teksty wizytówki 3.0. Każda rzecz jest powiedziana raz: strona główna mówi, co robi uczeń,
// sekcja o ludziach mówi, skąd są zadania i kto pomaga, a pytania dopowiadają resztę.

export const LEAD = tidy('Ćwiczysz typy zadań, które są na egzaminie.')
export const LEAD_TEXT = tidy(
  'Każda powtórka ma nowe liczby, więc liczysz od początku, zamiast przypominać sobie odpowiedź.',
)

const TOPIC_COUNT = Object.keys(BASIC_MAP.graph.stations).length

export const EXAM_TEXT: Record<Exam['id'], string> = {
  e8: tidy('Typy zadań z egzaminu ósmoklasisty, od działań na liczbach po geometrię.'),
  'matura-podstawowa': tidy(
    `${TOPIC_COUNT} ${plural(TOPIC_COUNT, ['temat', 'tematy', 'tematów'])} na mapie, od logarytmów po stereometrię.`,
  ),
  'matura-rozszerzona': tidy(
    'Zadania otwarte przechodzisz punkt po punkcie, tak jak ocenia je egzaminator.',
  ),
}

export const MAP_TITLE = 'Mapa tematów: jedna stacja naraz'
export const MAP_TEXT = tidy(
  'Każda linia to dział matematyki, a każda stacja to temat. Zaczynasz od jednej stacji, a mapa pamięta, gdzie skończyłeś.',
)

/** Krótki opis linii mapy matury podstawowej, po identyfikatorze linii. */
export const LINE_TEXT: Record<string, string> = {
  liczbowa: 'Potęgi, logarytmy i przekształcanie wyrażeń.',
  funkcyjna: 'Równania, funkcje i ciągi. Najdłuższa linia, jedziesz nią po kawałku.',
  statystyczna: 'Procenty, statystyka i prawdopodobieństwo.',
  geometryczna: 'Figury na płaszczyźnie, bryły i trygonometria.',
}

/** Kto albo co stoi za daną częścią aplikacji; `sheet` to arkusze i zasady CKE. */
export type Who = 'human' | 'program' | 'duty' | 'sheet'

export const CREW_TITLE = 'Tworzą ją ludzie. Pomaga Dyżurny.'

export interface CrewRole {
  what: string
  who: Who
  label: string
  text: string
}

export const CREW: readonly CrewRole[] = [
  {
    what: 'Zadania',
    who: 'sheet',
    label: 'arkusze CKE',
    text: tidy('Typy zadań pochodzą z arkuszy egzaminacyjnych CKE.'),
  },
  {
    what: 'Punktacja',
    who: 'sheet',
    label: 'zasady CKE',
    text: tidy('Zadania otwarte punktujemy według zasad oceniania CKE, tak jak egzaminator.'),
  },
  {
    what: 'Aplikacja',
    who: 'human',
    label: 'ludzie',
    text: tidy('Projektujemy ją, piszemy i testujemy sami, razem z uczniami.'),
  },
  {
    what: 'Pytania i podpowiedzi',
    who: 'duty',
    label: 'Dyżurny (AI)',
    text: tidy(
      'Dyżurny odpowiada na pytania i podpowiada następny krok, gdy utkniesz. Rozwiązanie zostaje twoje.',
    ),
  },
]

export const TRIAL_NOTE = tidy('Policz w zeszycie albo w pamięci i wpisz wynik.')
export const TRIAL_CHECKED = 'Wynik sprawdził program.'

export const STEPS_TEXT = tidy('Zadania rozwiązujesz w zeszycie, tak jak na egzaminie.')

export const STEPS = [
  {
    title: 'Sprawdzasz, co umiesz',
    text: tidy(
      'Zaczynasz od arkusza diagnostycznego, ułożonego jak prawdziwy egzamin. Po nim wiesz, które tematy masz opanowane, a które warto powtórzyć.',
    ),
  },
  {
    title: 'Wybierasz, od czego zacząć',
    text: tidy('Mapa tematów podpowiada kolejność, a wybór należy do ciebie.'),
  },
  {
    title: 'Powtarzasz, zanim zapomnisz',
    text: tidy(
      'Codziennie dostajesz kilka zadań. Aplikacja sama wylicza, kiedy wrócić do każdego typu.',
    ),
  },
  {
    title: 'Widzisz postęp',
    text: tidy(
      'Co kilka tygodni rozwiązujesz podobny arkusz i porównujesz wyniki. Dostajesz też szacunkowy wynik egzaminu, podany jako przedział.',
    ),
  },
]

export const TICKETS_TEXT = tidy('Wybierz egzamin, a kasownik wydrukuje twój bilet.')

export const FAQ = [
  {
    question: 'Kto sprawdza moje odpowiedzi?',
    answer: tidy(
      'Wynik porównuje z kluczem program, także gdy odpowiedzią jest wyrażenie. W zadaniu otwartym Dyżurny ocenia tok rozwiązania według zasad oceniania CKE.',
    ),
  },
  {
    question: 'Czy wystarczy telefon?',
    answer: tidy(
      'Tak. Liczysz w zeszycie, a w aplikacji wpisujesz wynik albo pokazujesz rozwiązanie na zdjęciu.',
    ),
  },
  {
    question: 'Czym różnią się bilety?',
    answer: tidy(
      'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
    ),
  },
]
