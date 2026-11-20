import { describe, expect, it } from 'vitest'
import { fullSizeFractions, splitMath } from '../math'

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

describe('fullSizeFractions', () => {
  it('makes fractions full size', () => {
    expect(fullSizeFractions('\\frac{1}{2} + \\sqrt{\\frac{3}{4}}')).toBe(
      '\\dfrac{1}{2} + \\sqrt{\\dfrac{3}{4}}',
    )
  })

  it('keeps fractions in exponents and subscripts small', () => {
    const tex = '5^{\\frac{1}{4}} \\cdot 2^\\frac12 \\cdot a_{\\frac{n}{2}}'
    expect(fullSizeFractions(tex)).toBe(tex)
  })

  it('goes back to full size after the exponent closes', () => {
    expect(fullSizeFractions('x^{2} \\frac{1}{x}')).toBe('x^{2} \\dfrac{1}{x}')
  })
})
