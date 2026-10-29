import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TemplateReview from '../TemplateReview.vue'
import { panelApi, type TemplateDetails } from '@/panel/api'

const ORIGINAL = {
  variant: null,
  content: 'Liczba $2^{3} \\cdot 2^{4}$ jest równa',
  choices: { A: '$2^{7}$', B: '$2^{12}$' },
  figures: null,
  answer: 'A',
  scoring: null,
}

function details(changes: Partial<TemplateDetails> = {}): TemplateDetails {
  return {
    body: { params: { a: { from: 2, to: 5 } } },
    ai_body: null,
    read_method: 'inne-ai',
    read_model: 'claude-opus-5-5',
    review_status: 'do-sprawdzenia',
    check_result: { passed: true, problems: [], successful: 180, draws: 200, distinct: 40 },
    preview: [ORIGINAL, { ...ORIGINAL, variant: { a: 3 }, content: 'Liczba $3^{3}$' }],
    ...changes,
  }
}

async function shown(loaded: TemplateDetails | null) {
  vi.spyOn(panelApi, 'template').mockResolvedValue(loaded)
  const wrapper = mount(TemplateReview, { props: { taskId: 30, exam: 'matura-podstawowa' } })
  await flushPromises()
  return wrapper
}

function button(wrapper: Awaited<ReturnType<typeof shown>>, name: string) {
  return wrapper.findAll('button').find((button) => button.text() === name)!
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TemplateReview', () => {
  it('invites to paste a template when the task has none', async () => {
    const wrapper = await shown(null)

    expect(wrapper.text()).toContain('Zadanie nie ma szablonu')
    expect(button(wrapper, 'Zaakceptuj').attributes('disabled')).toBeDefined()
  })

  it('shows the check result and the original next to variants', async () => {
    const wrapper = await shown(details())

    expect(wrapper.text()).toContain('losowania: 180/200 · warianty z różnymi danymi: 40')
    const titles = wrapper.findAll('.template__preview h3').map((title) => title.text())
    expect(titles).toEqual(['Oryginał', 'a = 3'])
    expect(button(wrapper, 'Zaakceptuj').attributes('disabled')).toBeUndefined()
  })

  it('lists problems and blocks accepting a failing template', async () => {
    const failing = { passed: false, problems: ['klucz B zamiast A'] }
    const wrapper = await shown(details({ check_result: failing }))

    expect(wrapper.text()).toContain('klucz B zamiast A')
    expect(button(wrapper, 'Zaakceptuj').attributes('disabled')).toBeDefined()
  })

  it('accepts the template', async () => {
    const wrapper = await shown(details())
    const accept = vi
      .spyOn(panelApi, 'acceptTemplate')
      .mockResolvedValue(details({ review_status: 'sprawdzone' }))

    await button(wrapper, 'Zaakceptuj').trigger('click')
    await flushPromises()

    expect(accept).toHaveBeenCalledWith(30)
    expect(wrapper.text()).toContain('Szablon zaakceptowany')
    expect(button(wrapper, 'Zaakceptuj').attributes('disabled')).toBeDefined()
  })

  it('sends the edited JSON and rejects a broken one before sending', async () => {
    const wrapper = await shown(details())
    const save = vi.spyOn(panelApi, 'saveTemplate').mockResolvedValue(details())

    await wrapper.find('textarea').setValue('{"params": ')
    await button(wrapper, 'Sprawdź i zapisz').trigger('click')
    await flushPromises()

    expect(save).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Szablon: niepoprawny JSON')

    await wrapper.find('textarea').setValue('{"params": {}}')
    await button(wrapper, 'Sprawdź i zapisz').trigger('click')
    await flushPromises()

    expect(save).toHaveBeenCalledWith(30, { params: {} })
  })

  it('puts template fields in reading order', async () => {
    const body = { original: { a: 2 }, answer: 'A', params: { a: { from: 2, to: 5 } } }
    const wrapper = await shown(details({ body }))

    const text = (wrapper.find('textarea').element as HTMLTextAreaElement).value
    expect(Object.keys(JSON.parse(text))).toEqual(['params', 'answer', 'original'])
  })

  it('shows the AI copy when the template was fixed by hand', async () => {
    const wrapper = await shown(details({ ai_body: { params: {} } }))

    expect(wrapper.find('details summary').text()).toBe('Szablon od AI przed poprawkami')
  })
})
