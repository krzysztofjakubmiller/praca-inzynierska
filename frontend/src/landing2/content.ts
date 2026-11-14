import type { Exam } from '@/config/exams'

/** Twarda spacja po jednoliterowym spójniku albo przyimku, żeby nie zostawał na końcu wiersza. */
export function tidy(text: string): string {
  return text.replace(/(^|[\s(„])([aiouwzAIOUWZ])\s/g, '$1$2 ')
}

export const LEAD = tidy('Ćwiczysz typy zadań, które są na egzaminie.')
export const LEAD_TEXT = tidy(
  'Każda powtórka ma nowe liczby, więc odpowiedzi nie da się zapamiętać. Aplikacja sama pilnuje, kiedy wrócić do danego zadania.',
)
export const LEAD_SHORT = tidy(
  'Każda powtórka ma nowe liczby, więc odpowiedzi nie da się zapamiętać.',
)
export const AUDIENCE = tidy(
  'Matura z matematyki, podstawowa i rozszerzona, oraz egzamin ósmoklasisty.',
)

export type Who = 'human' | 'program' | 'duty'

export const WHO_LABELS: Record<Who, string> = {
  human: 'człowiek',
  program: 'program',
  duty: 'Dyżurny (AI)',
}

export const CREW_TITLE = 'Zadania układa człowiek. Dyżurny pomaga.'
export const CREW_INTRO = tidy(
  'Nie jesteśmy kursem wygenerowanym przez AI. Zadania, zasady oceniania i całą aplikację robią i sprawdzają ludzie. AI ma u nas jedno stanowisko: Dyżurnego, który odpowiada na pytania.',
)

export interface CrewRole {
  what: string
  who: Who
  text: string
}

export const CREW: readonly CrewRole[] = [
  {
    what: 'Zadania',
    who: 'human',
    text: tidy('Każde zadanie układa i sprawdza człowiek. Żadnego nie wymyśla AI.'),
  },
  {
    what: 'Zasady oceniania',
    who: 'human',
    text: tidy(
      'Punkty w zadaniach otwartych liczymy według zasad oceniania CKE. Wprowadza je i sprawdza człowiek.',
    ),
  },
  {
    what: 'Wynik',
    who: 'program',
    text: tidy(
      'Czy odpowiedź jest dobra, sprawdza program, który porównuje ją z kluczem. Niczego nie zgaduje.',
    ),
  },
  {
    what: 'Aplikacja',
    who: 'human',
    text: tidy('Całą aplikację robią i testują ludzie, razem z uczniami.'),
  },
  {
    what: 'Pytania i podpowiedzi',
    who: 'duty',
    text: tidy(
      'Dyżurny odpowiada na pytania i podpowiada następny krok, gdy utkniesz. Nie rozwiązuje zadania za ciebie.',
    ),
  },
]

export const STEPS = [
  {
    title: 'Sprawdzasz, co umiesz',
    text: tidy(
      'Zaczynasz od arkusza diagnostycznego, ułożonego jak prawdziwy egzamin. Po nim wiesz, które tematy masz opanowane, a które warto powtórzyć.',
    ),
  },
  {
    title: 'Wybierasz, od czego zacząć',
    text: tidy(
      'Mapa tematów podpowiada kolejność, ale niczego nie blokuje. Możesz iść jej śladem albo wziąć dowolny temat.',
    ),
  },
  {
    title: 'Powtarzasz, zanim zapomnisz',
    text: tidy(
      'Codziennie dostajesz kilka zadań. Aplikacja sama wylicza, kiedy wrócić do każdego typu zadania.',
    ),
  },
  {
    title: 'Widzisz postęp',
    text: tidy(
      'Co kilka tygodni rozwiązujesz podobny arkusz i porównujesz wyniki. Dostajesz też szacunkowy wynik egzaminu, podany jako przedział.',
    ),
  },
]

/** Zapis ^{...} to indeks górny, _{...} dolny. */
export interface MathPart {
  text: string
  kind: 'text' | 'sup' | 'sub'
}

export function mathParts(source: string): MathPart[] {
  const parts: MathPart[] = []
  let last = 0
  for (const match of source.matchAll(/([\^_])\{([^}]*)\}/g)) {
    if (match.index > last) parts.push({ text: source.slice(last, match.index), kind: 'text' })
    parts.push({ text: match[2]!, kind: match[1] === '^' ? 'sup' : 'sub' })
    last = match.index + match[0].length
  }
  if (last < source.length) parts.push({ text: source.slice(last), kind: 'text' })
  return parts
}

export const DUTY_TASK = 'Rozwiąż równanie 8^{x − 1} = 4.'

export interface TalkMessage {
  from: 'student' | 'duty'
  text: string
}

// Rozmowa pokazowa, nie zapis prawdziwej.
export const DUTY_TALK: readonly TalkMessage[] = [
  { from: 'student', text: 'Utknąłem. Nie wiem, od czego zacząć.' },
  {
    from: 'duty',
    text: tidy('Spróbuj zapisać 8 i 4 jako potęgi tej samej liczby. Jaka to liczba?'),
  },
  { from: 'student', text: '2. Czyli 2^{3(x − 1)} = 2^{2}?' },
  { from: 'duty', text: 'Tak. Podstawy są równe, więc porównaj same wykładniki.' },
  { from: 'student', text: tidy('3x − 3 = 2, więc x = 5/3.') },
  { from: 'duty', text: 'Zgadza się, x = 5/3. Wynik sprawdził program, nie ja.' },
]

export interface Opinion {
  text: string
  author: string
  /** Opinia przykładowa zawsze dostaje widoczną etykietę. Prawdziwa ma tu `false`. */
  example: boolean
}

export const OPINIONS: readonly Opinion[] = [
  {
    text: tidy('Pierwszy raz wiem, co powtarzać, zamiast robić wszystko od początku.'),
    author: 'Imię, klasa maturalna',
    example: true,
  },
  {
    text: tidy('Te same zadania z innymi liczbami zmusiły mnie do liczenia, a nie do zgadywania.'),
    author: 'Imię, matura rozszerzona',
    example: true,
  },
  {
    text: tidy('Widzę, ile syn ćwiczył w tygodniu, i nie muszę go o to pytać.'),
    author: 'Rodzic ucznia',
    example: true,
  },
]

export const OPINIONS_NOTE = tidy(
  'To przykładowe opinie, które pokazują układ strony. Prawdziwe pojawią się po testach z uczniami.',
)

// Miejsca do uzupełnienia: zdjęcie, nagranie i podpis założyciela.
export const FOUNDER = {
  name: 'Imię i nazwisko',
  role: 'Tu podpis: kim jesteś i od kiedy uczysz matematyki',
  words: tidy(
    'Tu jedno albo dwa zdania od ciebie: po co zrobiłeś tę aplikację i co w niej sprawdzasz sam.',
  ),
  photoHint: 'Zdjęcie, pion 4:5',
  videoHint: 'Nagranie 60–90 s, pion 9:16',
}

export const FAQ = [
  {
    question: 'Czy zadania wymyśla AI?',
    answer: tidy(
      'Nie. Każde zadanie układa i sprawdza człowiek. AI, czyli Dyżurny, odpowiada na pytania i podpowiada, gdy utkniesz.',
    ),
  },
  {
    question: 'Kto sprawdza moje odpowiedzi?',
    answer: tidy(
      'Wynik sprawdza program, który porównuje go z kluczem, także gdy odpowiedzią jest wyrażenie. Gdy wynik zadania otwartego się nie zgadza, Dyżurny ocenia tok rozwiązania według zasad oceniania CKE.',
    ),
  },
  {
    question: 'Czy wystarczy telefon?',
    answer: tidy(
      'Tak. Zadania rozwiązujesz w zeszycie, tak jak na egzaminie, a w aplikacji wpisujesz wynik albo pokazujesz rozwiązanie na zdjęciu.',
    ),
  },
  {
    question: 'Czym różnią się bilety?',
    answer: tidy(
      'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
    ),
  },
]

// Terminy z harmonogramu CKE na 2027 rok, do potwierdzenia w komunikacie dyrektora CKE.
const EXAM_DAYS: Record<Exam['id'], string> = {
  e8: '2027-05-11',
  'matura-podstawowa': '2027-05-05',
  'matura-rozszerzona': '2027-05-11',
}

function examDay(exam: Exam['id']): Date {
  return new Date(`${EXAM_DAYS[exam]}T09:00:00`)
}

export function daysToExam(exam: Exam['id'], today: Date): number {
  const left = examDay(exam).getTime() - today.getTime()
  return Math.max(0, Math.ceil(left / (24 * 60 * 60 * 1000)))
}

export const MAP_ROUTES: Partial<Record<Exam['id'], string>> = {
  'matura-podstawowa': 'basic-matura',
  'matura-rozszerzona': 'extended-matura',
}
