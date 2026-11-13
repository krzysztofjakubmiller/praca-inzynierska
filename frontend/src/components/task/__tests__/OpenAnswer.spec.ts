import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import OpenAnswer from '../OpenAnswer.vue'
import type { PracticeTask as Task } from '@/practice'

vi.mock('@/mathKeyboard', () => ({ loadMathLive: () => Promise.resolve() }))

const TASK: Task = {
  id: 9,
  exam: 'matura-podstawowa',
  topic: 'liczby-rzeczywiste',
  topic_name: 'Liczby rzeczywiste',
  source: 'Maj',
  year: 2026,
  number: 12,
  subnumber: 1,
  max_points: 2,
  content: 'Uzupełnij zdania.',
  answer_format: 'otwarte',
  choices: null,
  connector: null,
  figures: null,
  results: [
    { part: '1', kind: 'liczba', points: 1 },
    { part: '2', kind: 'przedzial', points: 1 },
  ],
}

function serverReads(...latex: (string | null)[]) {
  const fetch = vi.fn<typeof globalThis.fetch>()
  for (const read of latex) {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ latex: read }), { status: 200 }))
  }
  vi.stubGlobal('fetch', fetch)
  return fetch
}

// W jsdom math-field to zwykły element bez MathLive, więc wpis to ustawienie value i zdarzenie
// input, jak przy pisaniu w edytorze.
async function type(field: ReturnType<ReturnType<typeof mount>['find']>, text: string) {
  ;(field.element as HTMLInputElement).value = text
  await field.trigger('input')
  await vi.advanceTimersByTimeAsync(400)
  await flushPromises()
}

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('OpenAnswer', () => {
  it('has one field per part and sends only when every entry was read', async () => {
    serverReads('6{,}38', null, '\\left(-3, 1\\right)')
    const wrapper = mount(OpenAnswer, { props: { task: TASK } })
    await flushPromises()
    const [first, second] = wrapper.findAll('math-field')
    const send = wrapper.findAll('button').find((found) => found.text() === 'Wyślij wynik')!

    expect(wrapper.findAll('label').map((found) => found.text())).toEqual([
      'Część 1 (1 pkt)',
      'Część 2 (1 pkt)',
    ])
    await type(first!, '6{,}38')
    await type(second!, '(-3;1')
    expect(wrapper.text()).toContain('Nie rozumiem tego zapisu')
    expect(send.attributes('disabled')).toBeDefined()

    await type(second!, '\\left(-3;1\\right)')
    await send.trigger('click')

    expect(wrapper.emitted('done')![0]).toEqual([
      { answers: ['6{,}38', '(-3;1)'] },
    ])
  })

  it('names the fields of several results without parts', () => {
    const results: Task['results'] = [
      { label: 'Objętość', kind: 'liczba' },
      { label: 'Pole powierzchni całkowitej', kind: 'liczba' },
    ]
    const wrapper = mount(OpenAnswer, { props: { task: { ...TASK, results } } })

    expect(wrapper.findAll('label').map((found) => found.text())).toEqual([
      'Objętość',
      'Pole powierzchni całkowitej',
    ])
  })

  it('has no field for a proof, which goes to AI', () => {
    const wrapper = mount(OpenAnswer, { props: { task: { ...TASK, results: [] } } })

    expect(wrapper.find('math-field').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
