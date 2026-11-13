import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AiTutor from '../AiTutor.vue'

vi.mock('@/mathKeyboard', () => ({
  loadMathLive: () => Promise.resolve(),
  keyboardInside: () => Promise.resolve(),
}))
// jsdom nie ma createImageBitmap ani płótna, więc zdjęcie przechodzi bez zmniejszania.
vi.mock('@/photo', () => ({
  shrinkPhoto: (file: File) => Promise.resolve(file),
  toBase64: () => Promise.resolve('ZmFrZQ=='),
}))
URL.createObjectURL = () => 'blob:zdjecie'

// Odpowiedź backendu jako strumień zdarzeń SSE, tak jak przychodzi z /question.
function stream(...events: [string, object][]) {
  const text = events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)
  return new Response(text.join(''), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

function serverAnswers(...responses: Response[]) {
  const fetch = vi.fn<typeof globalThis.fetch>()
  for (const response of responses) fetch.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetch)
  return fetch
}

async function askQuestion(wrapper: ReturnType<typeof mount>, text: string) {
  await wrapper.find('textarea').setValue(text)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

const props = {
  taskId: 7,
  checked: false,
  about: 'Logarytmy · Maj 2024, zad. 5',
  board: () => Promise.resolve(null),
  grading: null,
}

const GRADE = {
  id: 3,
  points: 2,
  max_points: 3,
  answer: '$x = 3$',
  explanation: 'Brakuje sprawdzenia dziedziny.',
  reading: 'x = 3',
  request_id: 9,
}

async function sendPhoto(wrapper: ReturnType<typeof mount>) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'kartka.jpg')] })
  await input.trigger('change')
  await flushPromises()
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

afterEach(() => vi.unstubAllGlobals())

describe('AiTutor', () => {
  it('glues the streamed pieces and sends the whole conversation', async () => {
    const fetch = serverAnswers(
      stream(['delta', { text: 'Zapisz 4 ' }], ['delta', { text: 'jako potęgę.' }], [
        'done',
        { request_id: 1 },
      ]),
      stream(['delta', { text: 'Tak, teraz odejmij.' }], ['done', { request_id: 2 }]),
    )
    const wrapper = mount(AiTutor, { props })

    await askQuestion(wrapper, 'Od czego zacząć?')
    await askQuestion(wrapper, 'To 2 do kwadratu?')

    expect(JSON.parse(fetch.mock.calls[1]![1]!.body as string)).toEqual({
      messages: [
        { role: 'user', content: 'Od czego zacząć?' },
        { role: 'assistant', content: 'Zapisz 4 jako potęgę.' },
        { role: 'user', content: 'To 2 do kwadratu?' },
      ],
      checked: false,
      strong: false,
    })
    expect(wrapper.text()).toContain('Tak, teraz odejmij.')
    expect(wrapper.text()).not.toContain('Odczyt się nie zgadza?')
    expect(wrapper.text()).not.toContain('To już wszystko?')
  })

  it('keeps a broken answer out of the history and lets the student retry', async () => {
    const fetch = serverAnswers(
      stream(['delta', { text: 'Zatrzymajmy' }], ['error', { message: 'Dyżurny przerwał.' }]),
      stream(['delta', { text: 'Pomyśl o potęgach dwójki.' }], ['done', { request_id: 3 }]),
    )
    const wrapper = mount(AiTutor, { props })

    await askQuestion(wrapper, 'Od czego zacząć?')
    expect(wrapper.text()).toContain('Dyżurny przerwał.')
    await wrapper.findAll('button').find((found) => found.text() === 'Spróbuj ponownie')!.trigger('click')
    await flushPromises()

    expect(JSON.parse(fetch.mock.calls[1]![1]!.body as string).messages).toEqual([
      { role: 'user', content: 'Od czego zacząć?' },
    ])
    expect(wrapper.text()).toContain('Pomyśl o potęgach dwójki.')
    expect(wrapper.text()).not.toContain('Zatrzymajmy')
  })

  it('treats a stream that ends without "done" as broken', async () => {
    serverAnswers(stream(['delta', { text: 'Zatrzymajmy' }]))
    const wrapper = mount(AiTutor, { props })

    await askQuestion(wrapper, 'Od czego zacząć?')

    expect(wrapper.text()).toContain('Połączenie się urwało')
  })

  it('asks about the help once, with a small link instead of buttons under every answer', async () => {
    const fetch = serverAnswers(
      stream(['delta', { text: 'Zapisz 4 jako potęgę.' }], ['done', { request_id: 1 }]),
      stream(['delta', { text: 'Teraz odejmij.' }], ['done', { request_id: 2 }]),
      new Response('null', { status: 200 }),
    )
    const wrapper = mount(AiTutor, { props })

    await askQuestion(wrapper, 'Od czego zacząć?')
    await askQuestion(wrapper, 'A potem?')
    expect(wrapper.text()).not.toContain('Pomogło')
    await wrapper.findAll('button').find((found) => found.text() === 'Jak poszło Dyżurnemu?')!.trigger('click')
    await wrapper.findAll('button').find((found) => found.text() === 'Tak')!.trigger('click')
    await flushPromises()

    expect(fetch.mock.calls[2]![0]).toContain('/ai-requests/2/feedback')
    expect(wrapper.text()).toContain('Dzięki za ocenę.')
  })

  it('says the daily limit is over without offering a retry', async () => {
    serverAnswers(new Response(JSON.stringify({ detail: ['Limit.'] }), { status: 429 }))
    const wrapper = mount(AiTutor, { props })

    await askQuestion(wrapper, 'Od czego zacząć?')

    expect(wrapper.text()).toContain('limit pytań do AI się skończył')
    expect(wrapper.text()).not.toContain('Spróbuj ponownie')
  })

  it('says AI is down and offers a retry', async () => {
    serverAnswers(new Response(JSON.stringify({ detail: ['Niedostępne.'] }), { status: 503 }))
    const wrapper = mount(AiTutor, { props })

    await askQuestion(wrapper, 'Od czego zacząć?')

    expect(wrapper.text()).toContain('Usługi AI chwilowo nie działają')
    expect(wrapper.text()).toContain('Spróbuj ponownie')
  })

  it('reminds about the difficulty rating after the answer was checked', async () => {
    serverAnswers(stream(['delta', { text: 'Bo to 5/3.' }], ['done', { request_id: 1 }]))
    const wrapper = mount(AiTutor, { props: { ...props, checked: true } })

    expect(wrapper.text()).not.toContain('To już wszystko?')
    await askQuestion(wrapper, 'Czemu nie −1?')

    expect(wrapper.text()).toContain('To już wszystko?')
  })

  it('grades a photo after a wrong open answer and keeps the best attempt on the same solution', async () => {
    const fetch = serverAnswers(new Response(JSON.stringify(GRADE), { status: 200 }))
    const grading = { solutionId: 3, mode: 'cwiczenie' as const, answers: ['5'] }
    const wrapper = mount(AiTutor, { props: { ...props, checked: true, grading } })

    await sendPhoto(wrapper)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]![0]).toContain('/tasks/7/grade')
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({
      mode: 'cwiczenie',
      answers: ['5'],
      solution_id: 3,
      image: 'ZmFrZQ==',
      image_type: 'image/jpeg',
    })
    expect(wrapper.emitted('graded')).toEqual([[GRADE]])
    expect(wrapper.text()).toContain('Ocena: 2 z 3 pkt. Brakuje sprawdzenia dziedziny.')
  })

  it('sends a changed board with the question, without grading when nothing is graded', async () => {
    const fetch = serverAnswers(stream(['delta', { text: 'Widzę błąd w drugiej linii.' }], ['done', { request_id: 1 }]))
    const board = () => Promise.resolve({ image: 'dGFibGljYQ==', image_type: 'image/png' as const })
    const wrapper = mount(AiTutor, { props: { ...props, board } })

    await askQuestion(wrapper, 'Co mam źle?')

    expect(fetch.mock.calls[0]![0]).toContain('/tasks/7/question')
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toMatchObject({
      image: 'dGFibGljYQ==',
      image_type: 'image/png',
    })
    expect(wrapper.text()).toContain('Dołączona tablica')
  })

  it('keeps a note about an earlier board in the history, so the tutor knows it saw one', async () => {
    const fetch = serverAnswers(
      stream(['delta', { text: 'Widzę 2137.' }], ['done', { request_id: 1 }]),
      stream(['delta', { text: 'To liczba z tablicy.' }], ['done', { request_id: 2 }]),
    )
    const picture = { image: 'dGFibGljYQ==', image_type: 'image/png' as const }
    const board = vi
      .fn<() => Promise<typeof picture | null>>()
      .mockResolvedValueOnce(picture)
      .mockResolvedValue(null)
    const wrapper = mount(AiTutor, { props: { ...props, board } })

    await askQuestion(wrapper, 'Co jest na tablicy?')
    await askQuestion(wrapper, 'Co znaczy ta liczba?')

    const second = JSON.parse(fetch.mock.calls[1]![1]!.body as string)
    expect(second.image).toBeUndefined()
    expect(second.messages[0].content).toBe('(Dołączony obraz tablicy.)\nCo jest na tablicy?')
  })

  it('asks the stronger model again when the board was misread, and keeps it for the rest', async () => {
    const fetch = serverAnswers(
      stream(['delta', { text: 'Widzę r = 12.' }], ['done', { request_id: 1 }]),
      stream(['delta', { text: 'Widzę r = √12.' }], ['done', { request_id: 2 }]),
      stream(['delta', { text: 'Teraz policz pole.' }], ['done', { request_id: 3 }]),
    )
    const picture = { image: 'dGFibGljYQ==', image_type: 'image/png' as const }
    const board = vi
      .fn<() => Promise<typeof picture | null>>()
      .mockResolvedValueOnce(picture)
      .mockResolvedValue(null)
    const wrapper = mount(AiTutor, { props: { ...props, board } })

    await askQuestion(wrapper, 'Co mam na tablicy?')
    await wrapper.findAll('button').find((found) => found.text() === 'Spróbuj jeszcze raz')!.trigger('click')
    await flushPromises()

    const again = JSON.parse(fetch.mock.calls[1]![1]!.body as string)
    expect(again).toMatchObject({ strong: true, image: 'dGFibGljYQ==' })
    expect(again.messages).toEqual([
      { role: 'user', content: '(Dołączony obraz tablicy.)\nCo mam na tablicy?' },
    ])
    expect(wrapper.text()).toContain('Widzę r = √12.')
    expect(wrapper.text()).not.toContain('Widzę r = 12.')
    expect(wrapper.text()).not.toContain('Odczyt się nie zgadza?')

    await askQuestion(wrapper, 'A dalej?')
    expect(JSON.parse(fetch.mock.calls[2]![1]!.body as string).strong).toBe(true)
  })

  it('asks again without grading the same photo twice', async () => {
    const fetch = serverAnswers(
      new Response(JSON.stringify(GRADE), { status: 200 }),
      stream(['delta', { text: 'Widzę x = 8.' }], ['done', { request_id: 1 }]),
      stream(['delta', { text: 'Widzę x = 3.' }], ['done', { request_id: 2 }]),
    )
    const grading = { solutionId: 3, mode: 'cwiczenie' as const, answers: ['5'] }
    const wrapper = mount(AiTutor, { props: { ...props, checked: true, grading } })

    await wrapper.find('textarea').setValue('Gdzie błąd?')
    await sendPhoto(wrapper)
    await wrapper.findAll('button').find((found) => found.text() === 'Spróbuj jeszcze raz')!.trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[2]![0]).toContain('/tasks/7/question')
    expect(wrapper.text()).toContain('Ocena: 2 z 3 pkt. Brakuje sprawdzenia dziedziny.')
    expect(wrapper.text()).toContain('Widzę x = 3.')
    expect(wrapper.text()).not.toContain('Widzę x = 8.')
  })
})
