// Spis stron wizytówki 3.0: całe strony, warianty mapy tematów i warianty biletu.

export interface VariantLink {
  name: string
  note: string
  to: string
  /** Tło i kolor wiodący strony, pokazywane jako próbka na liście. */
  colors: [string, string]
  /** Styl, w którym strona ma także ekrany aplikacji. */
  screens?: 'a' | 'b'
}

export const TABS = [
  {
    id: 'strony',
    name: 'Strony',
    path: '/wizytowka3',
    lead: 'Stacje w kolorze 3.5 z dwoma kasownikami, poprawione strony A i B z ekranami aplikacji oraz dwie strony z nowym pomysłem.',
  },
  {
    id: 'mapa',
    name: 'Mapa tematów',
    path: '/wizytowka3/mapa',
    lead: 'Pięć sposobów pokazania mapy tematów na wizytówce.',
  },
  {
    id: 'bilet',
    name: 'Bilet',
    path: '/wizytowka3/bilet',
    lead: 'Pięć sposobów pokazania biletu na wizytówce i trzy zachowania paska przy napisie „Start”.',
  },
] as const

export type TabId = (typeof TABS)[number]['id']

export const MAP_VARIANTS: VariantLink[] = [
  {
    name: 'Linia po linii',
    note: 'Jedna linia na pierwszym planie, reszta sieci w tle. Ta sama sekcja jest na stronach A i B.',
    to: '/wizytowka3/mapa/1',
    colors: ['#16224f', '#4fd58d'],
  },
  {
    name: 'Pociąg z brył',
    note: 'Geometryczny pociąg wjeżdża i rozkłada się na mapę tematów.',
    to: '/wizytowka3/mapa/2',
    colors: ['#101421', '#7fb0ff'],
  },
  {
    name: 'Postęp w czasie',
    note: 'Mapa zapełnia się tak, jak po kolejnych tygodniach nauki.',
    to: '/wizytowka3/mapa/3',
    colors: ['#f2f3f0', '#168344'],
  },
  {
    name: 'Ekran aplikacji',
    note: 'Prawdziwa mapa z aplikacji w ramce telefonu.',
    to: '/wizytowka3/mapa/4',
    colors: ['#e6e9f2', '#16224f'],
  },
  {
    name: 'Schemat linii',
    note: 'Cztery linie jak schemat nad drzwiami wagonu.',
    to: '/wizytowka3/mapa/5',
    colors: ['#ffffff', '#d42f23'],
  },
]

export const TICKET_VARIANTS: VariantLink[] = [
  {
    name: 'Kasownik z przyciskami',
    note: 'Trzy przyciski, bilet drukuje się ze szczeliny i zostaje z niej zabrany. Ten sam jest na stronach A i B.',
    to: '/wizytowka3/bilet/1',
    colors: ['#16224f', '#ffd35c'],
  },
  {
    name: 'Kasownik dotykowy',
    note: 'Ekran z cennikiem: dotknięcie ceny drukuje bilet, a przejście dalej go zrywa.',
    to: '/wizytowka3/bilet/2',
    colors: ['#ffd026', '#17181a'],
  },
  {
    name: 'Trzy bilety w ręku',
    note: 'Bilety leżą jeden na drugim, wybrany wysuwa się na wierzch.',
    to: '/wizytowka3/bilet/3',
    colors: ['#dff1e5', '#126b38'],
  },
  {
    name: 'Bilet do skasowania',
    note: 'Bilet wsuwa się do kasownika i wraca z pieczątką.',
    to: '/wizytowka3/bilet/4',
    colors: ['#fbe5e1', '#b3261b'],
  },
  {
    name: 'Cennik z biletem',
    note: 'Spokojna tabela cen i jeden bilet obok, bez maszyny.',
    to: '/wizytowka3/bilet/5',
    colors: ['#ffffff', '#1d1f22'],
  },
  {
    name: 'Pasek przy „Start”',
    note: 'Trzy zachowania paska na bilecie: sprężyna, odliczanie dni i dojazd wagonikiem.',
    to: '/wizytowka3/bilet/6',
    colors: ['#f2f3f0', '#1f9d55'],
  },
]

export const VARIANTS: Record<TabId, VariantLink[]> = {
  strony: [
    {
      name: 'Stacje w kolorze 3.5: kasownik z przyciskami',
      note: 'Początek jak w wersji 2.0, niżej mapy tematów w telefonie, tablica odjazdów i kasownik z trzema przyciskami.',
      to: '/wizytowka3/a35/przyciski',
      colors: ['#16224f', '#4fd58d'],
    },
    {
      name: 'Stacje w kolorze 3.5: kasownik dotykowy',
      note: 'Ta sama strona z kasownikiem, na którego ekranie dotyka się ceny biletu.',
      to: '/wizytowka3/a35/dotyk',
      colors: ['#16224f', '#ffd026'],
    },
    {
      name: 'Stacje w kolorze 3.0',
      note: 'Poprawiona strona A: gęstsze sekcje, mapa tematów, kasownik z biletem.',
      to: '/wizytowka3/a',
      colors: ['#16224f', '#ff7a69'],
      screens: 'a',
    },
    {
      name: 'Tablica odjazdów 3.0',
      note: 'Poprawiona strona B w jasnych tonach, z tablicą, która rusza dopiero przy przewijaniu.',
      to: '/wizytowka3/b',
      colors: ['#f3efe6', '#b06a00'],
      screens: 'b',
    },
    {
      name: 'Zeszyt w kratkę',
      note: 'Nowy pomysł: strona jak zeszyt do matematyki, z zadaniem do policzenia.',
      to: '/wizytowka3/zeszyt',
      colors: ['#fbfaf4', '#1f4fae'],
    },
    {
      name: 'Aplikacja w telefonie',
      note: 'Nowy pomysł: pastelowa strona, która prowadzi przez ekrany aplikacji.',
      to: '/wizytowka3/telefon',
      colors: ['#d9efe2', '#17181a'],
    },
  ],
  mapa: MAP_VARIANTS,
  bilet: TICKET_VARIANTS,
}
