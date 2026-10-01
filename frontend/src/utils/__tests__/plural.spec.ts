import { describe, it, expect } from 'vitest'

import { plural } from '@/utils/plural'

const forms: [string, string, string] = ['zadanie', 'zadania', 'zadań']

describe('plural', () => {
  it.each([
    [0, 'zadań'],
    [1, 'zadanie'],
    [2, 'zadania'],
    [4, 'zadania'],
    [5, 'zadań'],
    [12, 'zadań'],
    [14, 'zadań'],
    [22, 'zadania'],
    [25, 'zadań'],
    [112, 'zadań'],
    [124, 'zadania'],
  ])('uses the right form for %i', (count, form) => {
    expect(plural(count, forms)).toBe(form)
  })
})
