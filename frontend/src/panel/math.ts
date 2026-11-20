export type Piece = { kind: 'text'; text: string } | { kind: 'math'; tex: string; display: boolean }

// Najpierw $$...$$ (wzór w osobnym wierszu), potem $...$. \$ to zwykły znak dolara.
const MATH = /\$\$([\s\S]+?)\$\$|(?<!\\)\$([\s\S]+?)(?<!\\)\$/g

function textPiece(text: string): Piece {
  return { kind: 'text', text: text.replace(/\\\$/g, () => '$') }
}

export function splitMath(text: string): Piece[] {
  const pieces: Piece[] = []
  let last = 0
  for (const match of text.matchAll(MATH)) {
    if (match.index > last) pieces.push(textPiece(text.slice(last, match.index)))
    const display = match[1] !== undefined
    pieces.push({ kind: 'math', tex: (display ? match[1] : match[2]) ?? '', display })
    last = match.index + match[0].length
  }
  if (last < text.length) pieces.push(textPiece(text.slice(last)))
  return pieces
}

// Ułamek w zdaniu KaTeX zmniejsza do ok. 70%, przez co na telefonie był nieczytelny. Arkusze CKE
// drukują ułamki w pełnej wielkości, więc \frac zmienia się w \dfrac. Ułamek w wykładniku albo
// indeksie zostaje mały, bo pełny byłby wyższy od podstawy potęgi.
export function fullSizeFractions(tex: string): string {
  let out = ''
  // Dla każdej otwartej klamry: czy otwiera wykładnik albo indeks.
  const groups: boolean[] = []
  for (let index = 0; index < tex.length; index++) {
    const char = tex[index]!
    const inScript = groups.includes(true) || /[\^_]\s*$/.test(out)
    if (char === '\\') {
      const command = /^\\(?:[a-zA-Z]+|.)/.exec(tex.slice(index))?.[0] ?? char
      out += command === '\\frac' && !inScript ? '\\dfrac' : command
      index += command.length - 1
      continue
    }
    if (char === '{') groups.push(inScript)
    if (char === '}') groups.pop()
    out += char
  }
  return out
}
