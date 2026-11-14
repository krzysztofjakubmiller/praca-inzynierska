import { describe, it, expect } from 'vitest'

import { daysToExam, mathParts, tidy } from '@/landing2/content'

describe('tidy', () => {
  it('keeps one-letter words with the next word', () => {
    expect(tidy('Zadania w zeszycie i na tablicy')).toBe('Zadania w zeszycie i na tablicy')
  })

  it('leaves longer words alone', () => {
    expect(tidy('Mapa tematów')).toBe('Mapa tematów')
  })
})

describe('mathParts', () => {
  it('splits text into plain parts, superscripts and subscripts', () => {
    expect(mathParts('log_{2} 8 = 2^{3}!')).toEqual([
      { text: 'log', kind: 'text' },
      { text: '2', kind: 'sub' },
      { text: ' 8 = 2', kind: 'text' },
      { text: '3', kind: 'sup' },
      { text: '!', kind: 'text' },
    ])
  })
})

describe('daysToExam', () => {
  it('counts whole days left to the exam morning', () => {
    expect(daysToExam('matura-podstawowa', new Date('2027-05-03T09:00:00'))).toBe(2)
  })

  it('never goes below zero after the exam', () => {
    expect(daysToExam('matura-podstawowa', new Date('2027-06-01T12:00:00'))).toBe(0)
  })
})
