import type { VirtualKeyboardLayout, VirtualKeyboardName } from 'mathlive'

// Klawiatura do równań pod maturę, w układzie jak w Desmosie: po lewej zmienne i symbole, po
// prawej cyfry. Polskie zapisy: tg i ctg, przecinek dziesiętny, przedziały z nawiasem ⟨.
const LAYOUTS: (VirtualKeyboardLayout | VirtualKeyboardName)[] = [
  {
    label: '123',
    rows: [
      ['x', 'y', '#@^{2}', '#@^{#?}', '[separator]', '7', '8', '9', '\\div'],
      ['(', ')', '<', '>', '[separator]', '4', '5', '6', '\\cdot'],
      ['|#0|', '\\le', '\\ge', '\\neq', '[separator]', '1', '2', '3', '-'],
      [
        // Ułamek w zwykłej wielkości był wyższy od klawisza (klasa fraction w base.css go
        // zmniejsza). Na klawiszu ma dwie puste kratki, a wstawiony bierze do licznika
        // zaznaczenie albo to, co stoi przed kursorem.
        { insert: '\\frac{#@}{#?}', latex: '\\frac{#?}{#?}', class: 'fraction' },
        '\\sqrt{#0}',
        '\\pi',
        '=',
        '[separator]',
        '0',
        ',',
        '+',
        { label: '[backspace]', width: 1 },
      ],
    ],
  },
  {
    label: 'funkcje',
    rows: [
      [
        '\\sin',
        '\\cos',
        '\\operatorname{tg}',
        '\\operatorname{ctg}',
        // Logarytm i pierwiastek z pustymi polami nie mieszczą się na klawiszu: logarytm ma
        // sam napis, a pierwiastek mniejszą czcionkę.
        { insert: '\\log_{#?}{#0}', label: 'log' },
        { latex: '\\sqrt[#?]{#0}', class: 'small' },
      ],
      ['f(x)', 'a_{#?}', '\\infty', '\\in', '\\notin', '\\mathbb{R}'],
      ['\\langle', '\\rangle', '\\cup', '\\cap', '\\setminus', '\\emptyset'],
      ['^{\\circ}', '\\%', ';', '\\Rightarrow', '\\Leftrightarrow', { label: '[backspace]', width: 1 }],
    ],
  },
  'alphabetic',
  'greek',
]

let loading: Promise<void> | null = null

// MathLive ładuje się dopiero przy pierwszym edytorze równań, żeby nie spowalniać reszty stron.
export function loadMathLive(): Promise<void> {
  loading ??= import('mathlive').then(({ MathfieldElement }) => {
    // Czcionki przychodzą z mathlive/fonts.css przez Vite, więc biblioteka ich nie szuka.
    MathfieldElement.fontsDirectory = null
    MathfieldElement.soundsDirectory = null
    window.mathVirtualKeyboard.layouts = LAYOUTS
    window.mathVirtualKeyboard.addEventListener('geometrychange', makeRoom)
  })
  return loading
}

let sheet: HTMLElement | null = null

// Modalne okno (np. czat) leży nad całą stroną, a reszta strony nie przyjmuje wtedy dotyku.
// Klawiatura doczepiona do body byłaby pod oknem i nie dałoby się jej użyć, więc na czas
// otwarcia okna jest doczepiana do niego, a okno robi u dołu miejsce na jej wysokość, żeby
// nie zasłaniała pola. null przywraca body.
export async function keyboardInside(element: HTMLElement | null) {
  await loadMathLive()
  const keyboard = window.mathVirtualKeyboard
  if (sheet && !element) {
    sheet.style.paddingBottom = ''
    sheet.removeAttribute('data-keyboard')
  }
  document.body.style.paddingBottom = ''
  sheet = element
  keyboard.hide()
  keyboard.container = element ?? document.body
}

// Edytowane pole musi być nad klawiaturą, bo inaczej nie widać, co się wpisuje. Okno dostaje
// atrybut data-keyboard, żeby przy klawiaturze mogło urosnąć. Na zwykłej stronie klawiatura
// leży na wierzchu, więc strona dostaje u dołu miejsce na nią i przewija się, aż pole będzie
// nad klawiaturą.
function makeRoom() {
  const keyboard = window.mathVirtualKeyboard
  const room = sheet ?? document.body
  // boundingRect to same przyciski; tło klawiatury ma jeszcze odstępy u góry i u dołu.
  const backdrop = room.querySelector('.MLK__backdrop')?.getBoundingClientRect()
  const height = Math.max(backdrop?.height ?? 0, keyboard.boundingRect.height)
  room.style.paddingBottom = keyboard.visible ? `${height}px` : ''
  if (sheet) {
    sheet.toggleAttribute('data-keyboard', keyboard.visible)
    requestAnimationFrame(() => document.activeElement?.scrollIntoView({ block: 'nearest' }))
    return
  }
  requestAnimationFrame(() => {
    const field = document.activeElement
    if (!keyboard.visible || !field) return
    const hidden = field.getBoundingClientRect().bottom - (window.innerHeight - height) + 12
    if (hidden > 0) window.scrollBy({ top: hidden, behavior: 'smooth' })
  })
}
