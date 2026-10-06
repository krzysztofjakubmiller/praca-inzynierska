import type { Line, MapGraph, Station } from '../types'

// Trudności są na razie przykładowe.
const stations = {
  logarytmy: {
    name: 'Logarytmy',
    difficulty: 1,
    description:
      'Logarytm odpowiada na pytanie, do jakiej potęgi podnieść podstawę, żeby dostać daną liczbę. Nauczysz się go liczyć i upraszczać wyrażenia z logarytmami.',
  },
  'liczby-potegi': {
    name: 'Liczby. Potęgi',
    shortName: 'Liczby i potęgi',
    difficulty: 0,
    description:
      'Działania na potęgach i pierwiastkach, zapis bardzo dużych i bardzo małych liczb oraz przybliżenia. Na tych rachunkach opiera się większość zadań z matury.',
  },
  algebra: {
    name: 'Algebra',
    difficulty: 0,
    description:
      'Przekształcanie wyrażeń: wzory skróconego mnożenia, wyłączanie wspólnego czynnika przed nawias i upraszczanie. Przyda ci się przy równaniach i funkcjach.',
  },
  'dowody-algebra': {
    name: 'Dowody (algebra)',
    difficulty: 3,
    description:
      'Zadania typu „wykaż, że”: udowadniasz nierówność albo podzielność liczb, krok po kroku przekształcając wyrażenia. Liczy się każdy krok rozumowania.',
  },
  'rownania-nierownosci': {
    name: 'Równania. Nierówności',
    shortName: 'Równania i nierówności',
    difficulty: 1,
    description:
      'Rozwiązywanie równań i nierówności, od liniowych po proste wymierne. Nauczysz się sprawdzać, które liczby spełniają warunek, i zapisywać zbiór rozwiązań.',
  },
  wykresy: {
    name: 'Wykresy',
    difficulty: 0,
    description:
      'Odczytujesz z wykresu dziedzinę, zbiór wartości, miejsca zerowe i to, gdzie funkcja rośnie, a gdzie maleje. Poznasz też przesuwanie wykresów.',
  },
  wielomiany: {
    name: 'Wielomiany',
    difficulty: 1,
    description:
      'Dodawanie i mnożenie wielomianów, rozkład na czynniki i rozwiązywanie równań wielomianowych, na przykład trzeciego stopnia.',
  },
  'wartosc-bezwzgledna': {
    name: 'Wartość bezwzględna',
    difficulty: 1,
    description:
      'Wartość bezwzględna to odległość liczby od zera na osi liczbowej. Rozwiązujesz proste równania i nierówności, w których występuje.',
  },
  'funkcja-liniowa': {
    name: 'Funkcja liniowa',
    difficulty: 0,
    description:
      'Funkcja, której wykres jest prostą. Nauczysz się ją rysować, odczytywać współczynniki i wyznaczać wzór prostej przechodzącej przez dwa punkty.',
  },
  'uklad-rownan': {
    name: 'Układ równań',
    difficulty: 1,
    description:
      'Dwa równania z dwiema niewiadomymi, rozwiązywane podstawianiem albo przeciwnymi współczynnikami. Rozwiązanie to punkt przecięcia dwóch prostych.',
  },
  ciagi: {
    name: 'Ciągi',
    difficulty: 1,
    description:
      'Ciągi arytmetyczne i geometryczne: kolejne wyrazy, wzór ogólny i suma wyrazów. Przydają się w zadaniach o oszczędzaniu i wzroście.',
  },
  'funkcja-kwadratowa': {
    name: 'Funkcja kwadratowa',
    difficulty: 2,
    description:
      'Parabola, delta, miejsca zerowe i wierzchołek. Nauczysz się przechodzić między postaciami wzoru i rozwiązywać nierówności kwadratowe.',
  },
  optymalizacja: {
    name: 'Optymalizacja',
    difficulty: 3,
    description:
      'Szukasz największej albo najmniejszej wartości, na przykład największego pola przy danym obwodzie. Zwykle sprowadza się to do wierzchołka paraboli.',
  },
  'inne-funkcje': {
    name: 'Inne funkcje',
    difficulty: 2,
    description:
      'Funkcja wykładnicza i proporcjonalność odwrotna: ich wykresy, własności i zastosowania, na przykład w zadaniach o wzroście i zaniku.',
  },
  procenty: {
    name: 'Procenty',
    difficulty: 0,
    description:
      'Obliczenia procentowe w praktyce: podwyżki, obniżki, lokaty i różnica między procentem a punktem procentowym.',
  },
  statystyka: {
    name: 'Statystyka',
    difficulty: 0,
    description:
      'Średnia, mediana, dominanta i odchylenie standardowe. Nauczysz się liczyć je z danych i odczytywać informacje z tabel i diagramów.',
  },
  kombinatoryka: {
    name: 'Kombinatoryka',
    difficulty: 1,
    description:
      'Liczenie możliwości: ile jest kodów, ustawień albo wyborów. Poznasz regułę mnożenia i regułę dodawania.',
  },
  'rachunek-prawdopodobienstwa': {
    name: 'Rachunek prawdopodobieństwa',
    shortName: 'Prawdopodobieństwo',
    difficulty: 2,
    description:
      'Obliczasz szansę zdarzenia jako stosunek wyników sprzyjających do wszystkich możliwych. Pomaga w tym kombinatoryka i zdarzenie przeciwne.',
  },
  'geometria-analityczna': {
    name: 'Geometria analityczna',
    difficulty: 1,
    description:
      'Punkty i proste w układzie współrzędnych: odległość, środek odcinka, proste równoległe i prostopadłe. Rachunek zastępuje tu rysunek.',
  },
  trygonometria: {
    name: 'Trygonometria',
    difficulty: 2,
    description:
      'Sinus, cosinus i tangens w trójkącie prostokątnym oraz związki między nimi. Pozwalają liczyć boki i kąty bez mierzenia.',
  },
  planimetria: {
    name: 'Planimetria',
    difficulty: 1,
    description:
      'Trójkąty, czworokąty i okręgi: pola, obwody, twierdzenia Pitagorasa i Talesa oraz podobieństwo figur.',
  },
  stereometria: {
    name: 'Stereometria',
    difficulty: 2,
    description:
      'Graniastosłupy, ostrosłupy, walec, stożek i kula. Liczysz objętości, pola powierzchni i kąty w bryłach.',
  },
  'dowody-geometria': {
    name: 'Dowody (geometria)',
    difficulty: 3,
    description:
      'Zadania typu „wykaż, że” z geometrii: uzasadniasz własności figur, na przykład równość kątów albo podobieństwo trójkątów.',
  },
} satisfies Record<string, Station>

export type BasicStationId = keyof typeof stations

const lines: Line<BasicStationId>[] = [
  {
    id: 'liczbowa',
    name: 'Liczbowa',
    color: 1,
    stations: ['logarytmy', 'liczby-potegi', 'algebra', 'dowody-algebra'],
  },
  {
    id: 'funkcyjna',
    name: 'Funkcyjna',
    color: 2,
    stations: [
      'algebra',
      'rownania-nierownosci',
      'wykresy',
      'wielomiany',
      'wartosc-bezwzgledna',
      'funkcja-liniowa',
      'uklad-rownan',
      'ciagi',
      'funkcja-kwadratowa',
      'optymalizacja',
      'inne-funkcje',
    ],
  },
  {
    id: 'statystyczna',
    name: 'Statystyczna',
    color: 3,
    stations: [
      'procenty',
      'statystyka',
      'liczby-potegi',
      'kombinatoryka',
      'rachunek-prawdopodobienstwa',
    ],
  },
  {
    id: 'geometryczna',
    name: 'Geometryczna',
    color: 4,
    stations: [
      'funkcja-liniowa',
      'geometria-analityczna',
      'trygonometria',
      'planimetria',
      'stereometria',
      'dowody-geometria',
    ],
  },
]

export const BASIC_GRAPH: MapGraph<BasicStationId> = { stations, lines }
