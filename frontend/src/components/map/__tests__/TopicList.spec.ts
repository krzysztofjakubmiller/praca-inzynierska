import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import TopicList from '@/components/map/TopicList.vue'
import { BASIC_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'

let wrapper: VueWrapper | undefined

beforeAll(() => {
  // jsdom nie przewija i nie zna zapytań o media, z których lista korzysta przy wyborze karty.
  Element.prototype.scrollBy = () => {}
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
})

afterEach(() => wrapper?.unmount())

function render(selected?: string) {
  wrapper = mount(TopicList, {
    props: { map: BASIC_MAP, progress: BASIC_DEMO_PROGRESS, selected },
  })
  return wrapper
}

const card = (list: VueWrapper, name: string) =>
  list.findAll('.topic-card').find((item) => item.find('h3').text() === name)!

describe('TopicList', () => {
  it('lists every topic once, line by line', () => {
    const list = render()
    expect(list.findAll('h2').map((heading) => heading.text())).toEqual([
      'Linia Liczbowa',
      'Linia Funkcyjna',
      'Linia Statystyczna',
      'Linia Geometryczna',
    ])
    expect(list.findAll('.topic-card')).toHaveLength(23)
    expect(list.findAll('.topic-list__pass').map((row) => row.text())).toEqual([
      'Algebra · przesiadka',
      'Liczby. Potęgi · przesiadka',
      'Funkcja liniowa · przesiadka',
    ])
  })

  it('gives the longest line its own column on a wide screen', () => {
    expect(render().find('.topic-list__line--long h2').text()).toBe('Linia Funkcyjna')
  })

  it('says in words what the map shows with shapes and outlines', () => {
    const text = card(render(), 'Wielomiany').text()
    expect(text).toContain('44%')
    expect(text).toContain('Kontynuuj')
    expect(text).toMatch(/średni · słaby\s*· 11 do powtórki/)
    expect(text).toContain('powiązane z')
  })

  it('opens a topic from its card, its related topics and a transfer mention', async () => {
    const list = render()
    const wielomiany = card(list, 'Wielomiany')
    await wielomiany.find('h3 button').trigger('click')
    const related = wielomiany.findAll('.topic-card__link')
    expect(related.map((link) => link.text())).toEqual(['Wykresy', 'Wartość bezwzględna'])
    await related[0]!.trigger('click')
    await list.find('.topic-list__pass').trigger('click')
    expect(list.emitted('select')).toEqual([['wielomiany'], ['wykresy'], ['algebra']])
  })

  it('marks the topic whose panel is open', () => {
    const list = render('wykresy')
    expect(card(list, 'Wykresy').classes()).toContain('topic-card--selected')
    expect(list.findAll('.topic-card--selected')).toHaveLength(1)
  })
})
