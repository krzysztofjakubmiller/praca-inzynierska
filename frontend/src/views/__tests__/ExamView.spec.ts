import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import { setMapView } from '@/composables/useMapView'
import { BASIC_MAP, EXTENDED_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS, BASIC_DEMO_SHEETS } from '@/maps/basic/demoProgress'
import { EXTENDED_DEMO_PROGRESS, EXTENDED_DEMO_SHEETS } from '@/maps/extended/demoProgress'
import type { DiagnosticSheets } from '@/maps/nextStep'
import type { MapProgress, TopicMap } from '@/maps/types'
import router from '@/router'
import ExamView from '@/views/ExamView.vue'

// jsdom nie rysuje, więc mapę zastępuje atrapa, która zgłasza wybór stacji i pokazuje treść nad mapą.
const MapStub = defineComponent({
  name: 'MetroMap',
  emits: ['select'],
  setup(_, { expose, slots }) {
    expose({ focusStation: () => {} })
    return () => h('div', slots.before?.())
  },
})

let wrapper: VueWrapper | undefined

beforeAll(() => {
  // Router przewija stronę po każdej zmianie adresu, a lista po wyborze karty; jsdom nie umie przewijać.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  Element.prototype.scrollBy = () => {}
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  // jsdom ma element dialog, ale bez otwierania i zamykania.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  wrapper?.unmount()
  setMapView('map')
  localStorage.clear()
})

interface ExamProps {
  map: TopicMap
  progress: MapProgress<string>
  sheets: DiagnosticSheets
}

const BASIC: ExamProps = {
  map: BASIC_MAP,
  progress: BASIC_DEMO_PROGRESS,
  sheets: BASIC_DEMO_SHEETS,
}
const EXTENDED: ExamProps = {
  map: EXTENDED_MAP,
  progress: EXTENDED_DEMO_PROGRESS,
  sheets: EXTENDED_DEMO_SHEETS,
}

async function render(desktop: boolean, props = BASIC) {
  vi.stubGlobal('matchMedia', () => ({
    matches: desktop,
    addEventListener() {},
    removeEventListener() {},
  }))
  await router.push('/matura-podstawowa')
  wrapper = mount(ExamView, {
    props,
    global: { plugins: [router], stubs: { MetroMap: MapStub } },
    attachTo: document.body,
  })
  return wrapper
}

const side = (page: VueWrapper) => page.find('.exam-side')
const button = (page: VueWrapper, label: string) => page.find(`button[aria-label="${label}"]`)
const legendButton = (page: VueWrapper) =>
  page.findAll('button').find((item) => item.text() === 'Legenda')!
const pickStation = (page: VueWrapper, id: string) =>
  page.findComponent(MapStub).vm.$emit('select', id)

describe('ExamView on a computer', () => {
  it('keeps the menu in the left column', async () => {
    const page = await render(true)
    expect(side(page).find('nav').exists()).toBe(true)
    expect(button(page, 'Menu').exists()).toBe(false)
  })

  it('puts the chosen topic in place of the menu and brings the menu back', async () => {
    const page = await render(true)
    await pickStation(page, 'wielomiany')
    expect(side(page).find('h2').text()).toBe('Wielomiany')
    expect(side(page).find('nav').exists()).toBe(false)
    await button(page, 'Zamknij').trigger('click')
    expect(side(page).find('nav').exists()).toBe(true)
  })

  it('folds the menu into a bar and unfolds it', async () => {
    const page = await render(true)
    await button(page, 'Zwiń menu').trigger('click')
    expect(side(page).classes()).toContain('exam-side--collapsed')
    expect(side(page).find('nav').exists()).toBe(false)
    await button(page, 'Rozwiń menu').trigger('click')
    expect(side(page).find('nav').exists()).toBe(true)
  })

  it('unfolds the menu with the chosen topic and leaves it open after closing', async () => {
    const page = await render(true)
    await button(page, 'Zwiń menu').trigger('click')
    await pickStation(page, 'logarytmy')
    expect(side(page).classes()).not.toContain('exam-side--collapsed')
    expect(side(page).find('h2').text()).toBe('Logarytmy')
    await button(page, 'Zamknij').trigger('click')
    expect(side(page).find('nav').exists()).toBe(true)
  })

  it('shows the legend in place of the menu, also from a folded menu', async () => {
    const page = await render(true)
    await button(page, 'Zwiń menu').trigger('click')
    await legendButton(page).trigger('click')
    expect(side(page).classes()).not.toContain('exam-side--collapsed')
    expect(side(page).find('h2').text()).toBe('Legenda')
    await button(page, 'Zamknij legendę').trigger('click')
    expect(side(page).find('nav').exists()).toBe(true)
  })
})

describe('ExamView list', () => {
  it('swaps the map for the list and opens topics from it', async () => {
    const page = await render(true)
    const views = page.find('[aria-label="Widok tematów"]').findAll('button')
    await views[1]!.trigger('click')
    expect(views[1]!.attributes('aria-pressed')).toBe('true')
    expect(page.findComponent(MapStub).exists()).toBe(false)
    const wielomiany = page
      .findAll('.topic-card h3 button')
      .find((button) => button.text() === 'Wielomiany')!
    await wielomiany.trigger('click')
    expect(side(page).find('h2').text()).toBe('Wielomiany')
  })
})

describe('ExamView next step', () => {
  it('starts the column with the next step on a computer', async () => {
    const page = await render(true)
    expect(side(page).find('.next-step').text()).toBe('Powtórki · 78')
  })

  it('floats the next step over the map on a phone and hides it under the topic', async () => {
    const page = await render(false)
    expect(page.find('.exam-page__next').text()).toBe('Powtórki · 78')
    await pickStation(page, 'wielomiany')
    expect(page.find('.exam-page__next').exists()).toBe(false)
  })
})

describe('ExamView on a phone', () => {
  it('opens the legend above the map', async () => {
    const page = await render(false)
    const legend = legendButton(page)
    await legend.trigger('click')
    expect(legend.attributes('aria-expanded')).toBe('true')
    expect(page.findComponent(MapStub).find('h2').text()).toBe('Legenda')
  })

  it('keeps the menu in a drawer that opens from the header', async () => {
    const page = await render(false)
    expect(side(page).exists()).toBe(false)
    const drawer = page.find('dialog')
    expect(drawer.attributes('open')).toBeUndefined()
    await button(page, 'Menu').trigger('click')
    expect(drawer.attributes('open')).toBeDefined()
    await button(page, 'Zamknij menu').trigger('click')
    expect(drawer.attributes('open')).toBeUndefined()
  })
})

describe('ExamView for the extended matura', () => {
  it('shows its own exam, lines and topics', async () => {
    const page = await render(true, EXTENDED)
    expect(page.find('h1').text()).toBe('Matura rozszerzona')
    await pickStation(page, 'pochodna')
    expect(side(page).find('h2').text()).toBe('Pochodna')
    expect(side(page).text()).toContain('Linia Analizy matematycznej')
  })

  it('drops the chosen topic when the menu switches to another exam', async () => {
    const page = await render(true)
    await pickStation(page, 'wielomiany')
    await page.setProps(EXTENDED)
    expect(side(page).find('nav').exists()).toBe(true)
  })
})
