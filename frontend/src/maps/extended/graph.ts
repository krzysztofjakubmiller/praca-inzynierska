import type { Line, MapGraph, Station } from '../types'

const stations = {
  trygonometria: {
    name: 'Trygonometria',
    difficulty: 2,
    description:
      'Funkcje trygonometryczne dowolnego kąta, ich wykresy, wzory na sumę kątów i równania trygonometryczne.',
  },
  'wartosc-bezwzgledna': {
    name: 'Wartość bezwzględna',
    difficulty: 1,
    description:
      'Równania i nierówności z kilkoma wartościami bezwzględnymi. Rozwiązujesz je na przedziałach, na które dzielą oś miejsca zerowe wyrażeń.',
  },
  'wzory-vieta': {
    name: 'Wzory Vieta',
    difficulty: 1,
    description:
      'Równania kwadratowe z parametrem. Sumę i iloczyn pierwiastków liczysz prosto ze współczynników, bez wyznaczania samych pierwiastków.',
  },
  'funkcja-wykladnicza': {
    name: 'Funkcja wykładnicza',
    difficulty: 0,
    description:
      'Wykres i własności funkcji wykładniczej oraz równania i nierówności, w których niewiadoma stoi w wykładniku.',
  },
  logarytmy: {
    name: 'Logarytmy',
    difficulty: 0,
    description:
      'Logarytm odwraca potęgowanie. Zmieniasz podstawę logarytmu i rozwiązujesz równania oraz nierówności logarytmiczne.',
  },
  'dowody-algebra': {
    name: 'Dowody algebra',
    difficulty: 1,
    description:
      'Zadania typu „wykaż, że” z nierównościami i podzielnością liczb. Liczy się każdy krok rozumowania, nie tylko wynik.',
  },
  kombinatoryka: {
    name: 'Kombinatoryka',
    difficulty: 1,
    description:
      'Liczysz, na ile sposobów można coś wybrać albo ustawić: wariacje, permutacje i kombinacje. Treść trzeba uważnie przeczytać, zanim zaczniesz liczyć.',
  },
  'rachunek-prawdopodobienstwa': {
    name: 'Rachunek prawdopodobieństwa',
    shortName: 'Prawdopodobieństwo',
    difficulty: 1,
    description:
      'Prawdopodobieństwo warunkowe i całkowite oraz schemat Bernoulliego, czyli kilka powtórzeń tego samego doświadczenia.',
  },
  ciagi: {
    name: 'Ciągi',
    difficulty: 1,
    description:
      'Ciągi arytmetyczne i geometryczne, monotoniczność ciągu i ciągi zadane wzorem rekurencyjnym.',
  },
  'nieskonczonosc-w-ciagach': {
    name: 'Nieskończoność w ciągach',
    difficulty: 1,
    description:
      'Granica ciągu i suma nieskończonego ciągu geometrycznego. Sprawdzasz, do jakiej liczby zbliżają się kolejne wyrazy.',
  },
  granice: {
    name: 'Granice',
    difficulty: 1,
    description:
      'Granica funkcji w punkcie i w nieskończoności oraz ciągłość funkcji. To ta sama idea co granica ciągu, tylko dla funkcji.',
  },
  pochodna: {
    name: 'Pochodna',
    difficulty: 0,
    description:
      'Liczysz pochodną, wyznaczasz styczną do wykresu i z pochodnej odczytujesz, gdzie funkcja rośnie, maleje i ma ekstrema.',
  },
  optymalizacja: {
    name: 'Optymalizacja',
    difficulty: 0,
    description:
      'Szukasz największej albo najmniejszej wartości, najczęściej pola lub objętości. Układasz funkcję i badasz ją pochodną.',
  },
  'geometria-analityczna': {
    name: 'Geometria analityczna',
    difficulty: 1,
    description:
      'Proste i okręgi w układzie współrzędnych: odległość punktu od prostej, wzajemne położenie okręgów i styczne.',
  },
  planimetria: {
    name: 'Planimetria',
    difficulty: 3,
    description:
      'Twierdzenie sinusów i cosinusów, okręgi wpisane i opisane, podobieństwo. Do tego zadania typu „wykaż, że”, w których uzasadniasz własności figur.',
  },
  stereometria: {
    name: 'Stereometria',
    difficulty: 3,
    description:
      'Graniastosłupy, ostrosłupy i bryły obrotowe: kąty między ścianami, przekroje, pola i objętości.',
  },
} satisfies Record<string, Station>

export type ExtendedStationId = keyof typeof stations

// Funkcyjna przechodzi w linię analizy: granica ciągu prowadzi do granicy funkcji.
const lines: Line<ExtendedStationId>[] = [
  {
    id: 'funkcyjna',
    name: 'Funkcyjna',
    color: 2,
    stations: [
      'trygonometria',
      'wartosc-bezwzgledna',
      'wzory-vieta',
      'funkcja-wykladnicza',
      'ciagi',
      'nieskonczonosc-w-ciagach',
    ],
  },
  {
    id: 'analizy',
    name: 'Analizy matematycznej',
    color: 5,
    stations: ['nieskonczonosc-w-ciagach', 'granice', 'pochodna', 'optymalizacja'],
  },
  {
    id: 'liczbowa',
    name: 'Liczbowa',
    color: 1,
    stations: ['funkcja-wykladnicza', 'logarytmy', 'dowody-algebra'],
  },
  {
    // Łączy je to, że to zadania z długą treścią, którą trzeba najpierw dobrze przeczytać.
    id: 'statystyczna',
    name: 'Statystyczna',
    color: 3,
    stations: ['funkcja-wykladnicza', 'kombinatoryka', 'rachunek-prawdopodobienstwa'],
  },
  {
    id: 'geometryczna',
    name: 'Geometryczna',
    color: 4,
    stations: ['geometria-analityczna', 'optymalizacja', 'planimetria', 'stereometria'],
  },
]

export const EXTENDED_GRAPH: MapGraph<ExtendedStationId> = { stations, lines }
