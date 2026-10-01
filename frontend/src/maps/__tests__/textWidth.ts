// Szerokości liter z etykiet mapy (Mona Sans, waga 550, szerokość 87,5%) w jednostkach
// wielkości czcionki, zmierzone w przeglądarce. jsdom nie mierzy tekstu, więc testy liczą
// napis jako sumę liter; suma różni się od pomiaru o mniej niż 0,3%, zapas to 3%.
const WIDTHS: Record<string, number> = {
  ' ': 0.208,
  '(': 0.304,
  ')': 0.304,
  '.': 0.181,
  A: 0.582,
  C: 0.606,
  D: 0.601,
  F: 0.476,
  G: 0.638,
  I: 0.239,
  K: 0.567,
  L: 0.437,
  N: 0.622,
  O: 0.632,
  P: 0.543,
  R: 0.579,
  S: 0.534,
  T: 0.488,
  U: 0.597,
  W: 0.835,
  a: 0.515,
  b: 0.515,
  c: 0.473,
  d: 0.515,
  e: 0.468,
  f: 0.284,
  g: 0.504,
  h: 0.515,
  i: 0.222,
  j: 0.222,
  k: 0.477,
  l: 0.222,
  m: 0.808,
  n: 0.515,
  o: 0.497,
  p: 0.515,
  r: 0.322,
  s: 0.438,
  t: 0.303,
  u: 0.515,
  w: 0.656,
  y: 0.447,
  z: 0.405,
  ó: 0.497,
  ą: 0.515,
  ć: 0.473,
  ę: 0.482,
  ł: 0.252,
  ń: 0.515,
  ś: 0.438,
}

// Litera spoza tabeli liczy się jak bardzo szeroka, żeby test raczej nie przepuścił za długiej nazwy.
const UNKNOWN = 0.8
// Pogrubiony napis (waga 750) jest o 6,3% szerszy.
const BOLD = 1.07

export function measureLabel(text: string, fontSize: number, bold = false): number {
  const width = [...text].reduce((sum, char) => sum + (WIDTHS[char] ?? UNKNOWN), 0)
  return width * fontSize * 1.03 * (bold ? BOLD : 1)
}
