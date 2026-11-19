import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkSolution,
  nextInTopic,
  nextReview,
  randomTask,
  rateSolution,
  Rejected,
  splitInstructions,
  taskSource,
  type PracticeTask,
} from '@/practice'

const TASK: PracticeTask = {
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

function answer(status: number, body?: unknown) {
  const text = body === undefined ? null : JSON.stringify(body)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(text, { status })))
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('practice api', () => {
  it('asks for the next task of a topic with the session cookie and the access password', async () => {
    localStorage.setItem('haslo-dostepu', 'sekret')
    answer(200, { task: TASK, left: 3 })

    await expect(nextInTopic('matura-podstawowa', 'logarytmy', [])).resolves.toEqual({
      task: TASK,
      left: 3,
    })
    expect(fetch).toHaveBeenCalledWith('/api/practice/topic/matura-podstawowa/logarytmy/next', {
      method: 'GET',
      body: undefined,
      credentials: 'include',
      headers: { Authorization: 'Bearer sekret', 'Content-Type': 'application/json' },
    })
  })

  it('sends the chosen answer with the mode', async () => {
    answer(200, { id: 3, points: 1, max_points: 1, answer: 'C' })

    await checkSolution(7, 'cwiczenie', { answer: 'C' })

    const [url, init] = vi.mocked(fetch).mock.calls[0]!
    expect(url).toBe('/api/practice/tasks/7/solution')
    expect(JSON.parse(init!.body as string)).toEqual({ mode: 'cwiczenie', answer: 'C' })
  })

  it('lists the recently skipped tasks', async () => {
    answer(200, { task: null, left: 0 })

    await nextInTopic('matura-podstawowa', 'logarytmy', [4, 9])

    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(
      '/api/practice/topic/matura-podstawowa/logarytmy/next?skipped=4&skipped=9',
    )
  })

  it('returns when the rated task comes back', async () => {
    answer(200, { due: '2026-10-27T12:00:00+00:00', after_exam: false })

    await expect(rateSolution(3, 'sredni')).resolves.toEqual({
      due: '2026-10-27T12:00:00+00:00',
      after_exam: false,
    })
  })

  it('asks for reviews and random tasks with their filters', async () => {
    answer(200, { task: null, cards: 0, left_today: 0, limit: 20 })
    await nextReview('matura-podstawowa', true, [4])
    answer(200, { task: null, cards: 0 })
    await randomTask('matura-podstawowa', ['potegi', 'logarytmy'], [])

    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(
      '/api/practice/random/matura-podstawowa?topics=potegi&topics=logarytmy',
    )
  })

  it('passes the server messages and status on', async () => {
    answer(401, { detail: ['Nie zalogowano.'] })

    const error = await rateSolution(3, 'sredni').catch((caught) => caught)

    expect(error).toBeInstanceOf(Rejected)
    expect(error.status).toBe(401)
    expect(error.problems).toEqual(['Nie zalogowano.'])
  })

  it('throws a plain error when the server fails', async () => {
    answer(500)

    await expect(rateSolution(3, 'sredni')).rejects.toThrow('backend odpowiedział kodem 500')
  })
})

describe('taskSource', () => {
  it('names the session, year and number', () => {
    expect(taskSource(TASK)).toBe('Maj 2024, zad. 5')
    expect(taskSource({ ...TASK, source: 'Próbny', number: 9, subnumber: 1 })).toBe(
      'Próbny 2024, zad. 9.1',
    )
  })
})

describe('splitInstructions', () => {
  it('separates the CKE instruction from the description and the question', () => {
    const content =
      'Dana jest prosta $y=2x$.\nDokończ zdanie. Wybierz właściwą odpowiedź spośród podanych.\nLiczba $a$ jest równa'
    expect(splitInstructions(content)).toEqual([
      { text: 'Dana jest prosta $y=2x$.', instruction: false },
      {
        text: 'Dokończ zdanie. Wybierz właściwą odpowiedź spośród podanych.',
        instruction: true,
      },
      { text: 'Liczba $a$ jest równa', instruction: false },
    ])
  })

  it('leaves content without an instruction as one piece', () => {
    expect(splitInstructions('Oblicz $2+2$.')).toEqual([
      { text: 'Oblicz $2+2$.', instruction: false },
    ])
  })

  it('finds an instruction at the end', () => {
    expect(splitInstructions('Wykaż, że $a>0$.\nZapisz obliczenia.')).toEqual([
      { text: 'Wykaż, że $a>0$.', instruction: false },
      { text: 'Zapisz obliczenia.', instruction: true },
    ])
  })
})
