import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PracticeTask from '../PracticeTask.vue'
import type { PracticeTask as Task } from '@/practice'

const TASK: Task = {
  id: 7,
  exam: 'matura-podstawowa',
  topic: 'logarytmy',
  topic_name: 'Logarytmy',
  source: 'Maj',
  year: 2024,
  number: 5,
  subnumber: null,
  max_points: 1,
  content: 'Liczba $\\log_2 8$ jest równa',
  answer_format: 'wielokrotny-wybor',
  choices: { A: '$1$', B: '$2$', C: '$3$', D: '$4$' },
  connector: null,
  figures: null,
}

// Kolejne odpowiedzi serwera: najpierw na sprawdzenie, potem na ocenę.
function serverAnswers(...bodies: object[]) {
  const fetch = vi.fn<typeof globalThis.fetch>()
  for (const body of bodies) {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }))
  }
  vi.stubGlobal('fetch', fetch)
  return fetch
}

function sentBody(fetch: ReturnType<typeof serverAnswers>, call: number) {
  return JSON.parse(fetch.mock.calls[call]![1]!.body as string)
}

function button(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((found) => found.text().includes(text))!
}

afterEach(() => vi.unstubAllGlobals())

describe('PracticeTask', () => {
  it('checks the chosen answer and says it is right', async () => {
    const fetch = serverAnswers({ id: 3, points: 1, max_points: 1, answer: 'C' })
    const wrapper = mount(PracticeTask, { props: { task: TASK, mode: 'cwiczenie' } })

    expect(button(wrapper, 'Sprawdź').attributes('disabled')).toBeDefined()
    await button(wrapper, 'C.').trigger('click')
    await button(wrapper, 'Sprawdź').trigger('click')
    await flushPromises()

    expect(sentBody(fetch, 0)).toEqual({ mode: 'cwiczenie', answer: 'C' })
    expect(wrapper.find('[role="status"]').text()).toBe('Dobrze')
    expect(wrapper.findAll('.practice-task__rate').map((found) => found.text())).toEqual([
      'łatwy',
      'średni',
      'trudny',
      'bardzo trudny',
    ])
  })

  it('shows the key and hides "easy" after a wrong answer', async () => {
    serverAnswers({ id: 3, points: 0, max_points: 1, answer: 'C' })
    const wrapper = mount(PracticeTask, { props: { task: TASK, mode: 'losowe' } })

    await button(wrapper, 'A.').trigger('click')
    await button(wrapper, 'Sprawdź').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="status"]').text()).toBe('Źle. Poprawna odpowiedź: C')
    expect(wrapper.text()).not.toContain('łatwy')
    expect(button(wrapper, 'C.').classes()).toContain('practice-task__choice--key')
  })

  it('sends the rating and asks for the next task', async () => {
    const fetch = serverAnswers(
      { id: 3, points: 1, max_points: 1, answer: 'C' },
      { due: '2026-10-27T12:00:00+00:00', after_exam: false },
    )
    const wrapper = mount(PracticeTask, { props: { task: TASK, mode: 'cwiczenie' } })

    await button(wrapper, 'C.').trigger('click')
    await button(wrapper, 'Sprawdź').trigger('click')
    await flushPromises()
    await button(wrapper, 'trudny').trigger('click')
    await flushPromises()

    expect(fetch.mock.calls[1]![0]).toBe('/api/practice/solutions/3/rating')
    expect(sentBody(fetch, 1)).toEqual({ rating: 'trudny' })
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('says when the task will not come back before the exam', async () => {
    serverAnswers(
      { id: 3, points: 1, max_points: 1, answer: 'C' },
      { due: '2027-06-01T12:00:00+00:00', after_exam: true },
    )
    const wrapper = mount(PracticeTask, { props: { task: TASK, mode: 'powtorka' } })

    await button(wrapper, 'C.').trigger('click')
    await button(wrapper, 'Sprawdź').trigger('click')
    await flushPromises()
    await button(wrapper, 'łatwy').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('nie wróci już przed maturą')
    expect(wrapper.emitted('next')).toBeUndefined()
    await button(wrapper, 'Dalej').trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('builds the true-false answer from every row', async () => {
    const fetch = serverAnswers({ id: 3, points: 1, max_points: 1, answer: 'PF' })
    const task: Task = {
      ...TASK,
      answer_format: 'prawda-falsz',
      choices: { '1': 'Zdanie pierwsze', '2': 'Zdanie drugie' },
    }
    const wrapper = mount(PracticeTask, { props: { task, mode: 'cwiczenie' } })

    await wrapper.find('[aria-label="Zdanie 1: prawda"]').trigger('click')
    expect(button(wrapper, 'Sprawdź').attributes('disabled')).toBeDefined()
    await wrapper.find('[aria-label="Zdanie 2: fałsz"]').trigger('click')
    await button(wrapper, 'Sprawdź').trigger('click')
    await flushPromises()

    expect(sentBody(fetch, 0).answer).toBe('PF')
  })

  it('pairs one letter with one digit when matching', async () => {
    const fetch = serverAnswers({ id: 3, points: 1, max_points: 1, answer: 'B1' })
    const task: Task = {
      ...TASK,
      answer_format: 'dobieranie',
      choices: { A: 'Tak', B: 'Nie', '1': 'bo $2>1$', '2': 'bo $2<1$' },
      connector: 'ponieważ',
    }
    const wrapper = mount(PracticeTask, { props: { task, mode: 'cwiczenie' } })

    await button(wrapper, 'A.').trigger('click')
    await button(wrapper, '2.').trigger('click')
    await button(wrapper, 'B.').trigger('click')
    await button(wrapper, '1.').trigger('click')
    await button(wrapper, 'Sprawdź').trigger('click')
    await flushPromises()

    expect(sentBody(fetch, 0).answer).toBe('B1')
  })

  it('saves self-assessed points of an open task', async () => {
    const fetch = serverAnswers({ id: 3, points: 1, max_points: 2, answer: '$x = 3$' })
    const task: Task = {
      ...TASK,
      answer_format: 'otwarte',
      choices: null,
      max_points: 2,
      model_answer: '$x = 3$',
    }
    const wrapper = mount(PracticeTask, { props: { task, mode: 'cwiczenie' } })

    expect(wrapper.text()).not.toContain('Sprawdź')
    await button(wrapper, 'Pokaż rozwiązanie').trigger('click')
    expect(wrapper.find('.open-answer__model .katex').exists()).toBe(true)
    await button(wrapper, '1 z 2').trigger('click')
    await flushPromises()

    expect(sentBody(fetch, 0)).toEqual({ mode: 'cwiczenie', points: 1 })
    expect(wrapper.find('[role="status"]').text()).toBe('1 z 2 pkt')
    expect(wrapper.text()).not.toContain('łatwy')
  })

  it('shows the messages from the server', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: ['Nie ma takiego zadania.'] }), { status: 404 }),
        ),
    )
    const wrapper = mount(PracticeTask, { props: { task: TASK, mode: 'cwiczenie' } })

    await button(wrapper, 'C.').trigger('click')
    await button(wrapper, 'Sprawdź').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('Nie ma takiego zadania.')
  })
})
