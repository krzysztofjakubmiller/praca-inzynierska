import { describe, expect, it } from 'vitest'
import { splitMath } from '../math'

describe('splitMath', () => {
  it('leaves plain text alone', () => {
    expect(splitMath('Oblicz pole.')).toEqual([{ kind: 'text', text: 'Oblicz pole.' }])
  })

  it('finds inline and display formulas', () => {
    expect(splitMath('Liczba $\\log_2 8$ to\n$$x^2$$')).toEqual([
      { kind: 'text', text: 'Liczba ' },
      { kind: 'math', tex: '\\log_2 8', display: false },
      { kind: 'text', text: ' to\n' },
      { kind: 'math', tex: 'x^2', display: true },
    ])
  })

  it('treats an escaped dollar as text', () => {
    expect(splitMath('Cena \\$5 i $x$')).toEqual([
      { kind: 'text', text: 'Cena $5 i ' },
      { kind: 'math', tex: 'x', display: false },
    ])
  })
})
