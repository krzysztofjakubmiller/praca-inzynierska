import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AiSolution from '../AiSolution.vue'

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

afterEach(() => vi.unstubAllGlobals())

describe('AiSolution', () => {
  it('shows the streamed solution with the feedback buttons', async () => {
    const fetch = serverAnswers(
      stream(['delta', { text: 'Krok 1. ' }], ['delta', { text: 'Krok 2.' }], [
        'done',
        { request_id: 4 },
      ]),
    )
    const wrapper = mount(AiSolution, { props: { taskId: 7 } })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(fetch.mock.calls[0]![0]).toBe('/api/practice/tasks/7/ai-solution')
    expect(wrapper.text()).toContain('Krok 1. Krok 2.')
    expect(wrapper.text()).toContain('Pomogło')
  })

  it('drops a broken solution and offers a retry', async () => {
    serverAnswers(
      stream(['delta', { text: 'Krok 1.' }], ['error', { message: 'Dyżurny przerwał.' }]),
    )
    const wrapper = mount(AiSolution, { props: { taskId: 7 } })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Dyżurny przerwał.')
    expect(wrapper.text()).not.toContain('Krok 1.')
    expect(wrapper.find('button').text()).toBe('Spróbuj ponownie')
  })
})
