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
