import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import OpenAnswer from '../OpenAnswer.vue'
import type { PracticeTask as Task } from '@/practice'

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

async function type(input: ReturnType<ReturnType<typeof mount>['find']>, text: string) {
  await input.setValue(text)
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
    const [first, second] = wrapper.findAll('input')
    const send = wrapper.findAll('button').find((found) => found.text() === 'Wyślij wynik')!

    expect(wrapper.findAll('label').map((found) => found.text())).toEqual([
      'Część 1 (1 pkt)',
      'Część 2 (1 pkt)',
    ])
    await type(first!, '6,38')
    await type(second!, '(-3; 1')
    expect(wrapper.text()).toContain('Nie rozumiem tego zapisu')
    expect(send.attributes('disabled')).toBeDefined()

    await type(second!, '(-3; 1)')
    await send.trigger('click')

    expect(wrapper.emitted('done')![0]).toEqual([{ answers: ['6,38', '(-3; 1)'] }])
  })

  it('inserts a sign where the cursor is', async () => {
    serverReads('2 \\sqrt{3}')
    const wrapper = mount(OpenAnswer, {
      props: { task: { ...TASK, results: [{ kind: 'liczba' }] } },
      attachTo: document.body,
    })
    const input = wrapper.find('input')
    await input.setValue('23')
    ;(input.element as HTMLInputElement).setSelectionRange(1, 1)

    await wrapper.find('[aria-label="Wstaw √"]').trigger('click')

    expect((input.element as HTMLInputElement).value).toBe('2√3')
    wrapper.unmount()
  })

  it('has no field for a proof, which goes to AI', () => {
    const wrapper = mount(OpenAnswer, { props: { task: { ...TASK, results: [] } } })

    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
