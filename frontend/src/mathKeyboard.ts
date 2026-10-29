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
      ['\\frac{#@}{#?}', '\\sqrt{#0}', '\\pi', '=', '[separator]', '0', ',', '+', '[backspace]'],
    ],
  },
  {
    label: 'funkcje',
    rows: [
      ['\\sin', '\\cos', '\\operatorname{tg}', '\\operatorname{ctg}', '\\log_{#?}{#0}', '\\sqrt[#?]{#0}'],
      ['f(x)', 'a_{#?}', '\\infty', '\\in', '\\notin', '\\mathbb{R}'],
      ['\\langle', '\\rangle', '\\cup', '\\cap', '\\setminus', '\\emptyset'],
      ['^{\\circ}', '\\%', ';', '\\Rightarrow', '\\Leftrightarrow', '[backspace]'],
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
  })
  return loading
}
