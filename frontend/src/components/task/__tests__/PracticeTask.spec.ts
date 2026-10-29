import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PracticeTask from '../PracticeTask.vue'
import type { PracticeTask as Task } from '@/practice'

// MathLive potrzebuje prawdziwej przeglądarki; tu wystarczą wiersze tekstu w edytorze.
vi.mock('@/mathKeyboard', () => ({ loadMathLive: () => Promise.resolve() }))

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

// Tablica ma własne testy, a jsdom nie ma płótna ani ResizeObserver, więc tu jej nie ma.
const stubs = { TaskWhiteboard: true }

describe('PracticeTask', () => {
  it('checks the chosen answer and says it is right', async () => {
    const fetch = serverAnswers({ id: 3, points: 1, max_points: 1, answer: 'C' })
    const wrapper = mount(PracticeTask, {
      global: { stubs },
      props: { task: TASK, mode: 'cwiczenie' },
    })

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
    const wrapper = mount(PracticeTask, {
      global: { stubs },
      props: { task: TASK, mode: 'losowe' },
    })

    await button(wrapper, 'A.').trigger('click')
    await button(wrapper, 'Sprawdź').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="status"]').text()).toBe('Źle. Poprawna odpowiedź: C')
    expect(wrapper.text()).not.toContain('łatwy')
    expect(button(wrapper, 'C.').classes()).toContain('practice-task__choice--correct')
    expect(button(wrapper, 'C.').find('.practice-task__sign').text()).toBe('✓')
    expect(button(wrapper, 'A.').classes()).toContain('practice-task__choice--wrong')
    expect(button(wrapper, 'A.').find('.practice-task__sign').text()).toBe('✗')
    expect(button(wrapper, 'B.').find('.practice-task__sign').exists()).toBe(false)
  })

  it('sends the rating and asks for the next task', async () => {
    const fetch = serverAnswers(
      { id: 3, points: 1, max_points: 1, answer: 'C' },
      { due: '2026-10-27T12:00:00+00:00', after_exam: false },
    )
    const wrapper = mount(PracticeTask, {
      global: { stubs },
      props: { task: TASK, mode: 'cwiczenie' },
    })

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
    const wrapper = mount(PracticeTask, {
      global: { stubs },
      props: { task: TASK, mode: 'powtorka' },
    })

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
    const wrapper = mount(PracticeTask, {
      global: { stubs },
      props: { task, mode: 'cwiczenie' },
    })

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
    const wrapper = mount(PracticeTask, {
      global: { stubs },
      props: { task, mode: 'cwiczenie' },
    })

    await button(wrapper, 'A.').trigger('click')
    await button(wrapper, '2.').trigger('click')
    await button(wrapper, 'B.').trigger('click')
    await button(wrapper, '1.').trigger('click')
    await button(wrapper, 'Sprawdź').trigger('click')
    await flushPromises()

    expect(sentBody(fetch, 0).answer).toBe('B1')
  })

  it('sends the final result of an open task once and shows the key when it is wrong', async () => {
    vi.useFakeTimers()
    const fetch = serverAnswers(
      { latex: '4' },
      { id: 3, points: 0, max_points: 2, answer: '$x = 3$' },
    )
    const task: Task = {
      ...TASK,
      answer_format: 'otwarte',
      choices: null,
      max_points: 2,
      results: [{ kind: 'liczba' }],
    }
    const wrapper = mount(PracticeTask, {
      global: { stubs },
      props: { task, mode: 'cwiczenie' },
    })

    expect(button(wrapper, 'Wyślij wynik').attributes('disabled')).toBeDefined()
    await wrapper.find('input').setValue('4')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    await button(wrapper, 'Wyślij wynik').trigger('click')
    await flushPromises()
    vi.useRealTimers()

    expect(sentBody(fetch, 0)).toEqual({ kind: 'liczba', text: '4' })
    expect(sentBody(fetch, 1)).toEqual({ mode: 'cwiczenie', answers: ['4'] })
    expect(wrapper.find('.practice-task__result').text()).toContain('0 z 2 pkt. Poprawny wynik:')
    expect(wrapper.text()).toContain('Oceń rozwiązanie')
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('łatwy')
  })

  it('sends a described proof to AI and shows the points with the explanation', async () => {
    const fetch = serverAnswers({
      id: 5,
      points: 1,
      max_points: 2,
      answer: 'Szkic dowodu.',
      explanation: 'Brakuje wniosku.',
      reading: 'Wyłączam 2.',
    })
    const task: Task = {
      ...TASK,
      answer_format: 'otwarte',
      choices: null,
      max_points: 2,
      results: [],
    }
    const wrapper = mount(PracticeTask, {
      global: { stubs },
      props: { task, mode: 'cwiczenie' },
    })

    await button(wrapper, 'Opis').trigger('click')
    await wrapper.find('textarea').setValue('Wyłączam 2.')
    await button(wrapper, 'Oceń rozwiązanie').trigger('click')
    await flushPromises()

    expect(fetch.mock.calls[0]![0]).toContain(`/tasks/${TASK.id}/grade`)
    expect(sentBody(fetch, 0)).toEqual({ mode: 'cwiczenie', answers: [], text: 'Wyłączam 2.' })
    expect(wrapper.find('.practice-task__result').text()).toBe('1 z 2 pkt')
    expect(wrapper.text()).toContain('Brakuje wniosku.')
    expect(wrapper.text()).toContain('Dopytaj się')
  })

  it('says only "Dobrze" when the open result is right', async () => {
    vi.useFakeTimers()
    serverAnswers({ latex: '3' }, { id: 4, points: 2, max_points: 2, answer: '$x = 3$' })
    const task: Task = {
      ...TASK,
      answer_format: 'otwarte',
      choices: null,
      max_points: 2,
      results: [{ kind: 'liczba' }],
    }
    const wrapper = mount(PracticeTask, {
      global: { stubs },
      props: { task, mode: 'cwiczenie' },
    })

    await wrapper.find('input').setValue('3')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    await button(wrapper, 'Wyślij wynik').trigger('click')
    await flushPromises()
    vi.useRealTimers()

    expect(wrapper.find('.practice-task__result').text()).toBe('Dobrze')
    expect(wrapper.text()).not.toContain('Poprawny wynik')
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
    const wrapper = mount(PracticeTask, {
      global: { stubs },
      props: { task: TASK, mode: 'cwiczenie' },
    })

    await button(wrapper, 'C.').trigger('click')
    await button(wrapper, 'Sprawdź').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('Nie ma takiego zadania.')
  })
})
