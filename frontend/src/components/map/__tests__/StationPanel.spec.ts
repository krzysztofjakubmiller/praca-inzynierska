import { afterEach, describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import StationPanel from '@/components/map/StationPanel.vue'
import { BASIC_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import router from '@/router'

let wrapper: VueWrapper | undefined

function open(stationId: string) {
  wrapper = mount(StationPanel, {
    props: { map: BASIC_MAP, progress: BASIC_DEMO_PROGRESS, stationId },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  return wrapper
}

afterEach(() => wrapper?.unmount())

describe('StationPanel', () => {
  it('shows the topic with its progress, effectiveness and reviews', () => {
    const panel = open('wielomiany')
    expect(panel.find('h2').text()).toBe('Wielomiany')
    const text = panel.text()
    expect(text).toContain('średni')
    expect(text).toContain('słaby')
    // Liczba i słowo stoją w osobnych elementach, więc w tekście nie ma między nimi spacji.
    expect(text).toMatch(/Zrobione\s*44%\s*14 z 32 zadań/)
    expect(text).toMatch(/Skuteczność\s*43%\s*dobrze z ostatnich 14/)
    expect(text).toMatch(/Do powtórki\s*11\s*zadań/)
    expect(text).toContain('Ostatnio: dzisiaj')
  })

  it('asks the student to continue at the last station', () => {
    const links = open('wielomiany')
      .findAll('a')
      .map((link) => link.text())
    expect(links).toEqual(['Kontynuuj', 'Powtórki · 11', 'Teoria'])
  })

  it('shows effectiveness from the first variant without judging the topic yet', () => {
    const text = open('wartosc-bezwzgledna').text()
    expect(text).toMatch(/Skuteczność\s*67%\s*dobrze z ostatnich 3/)
    expect(text).toContain('w nauce')
  })

  it('waits with effectiveness until the first task', () => {
    const text = open('stereometria').text()
    expect(text).toContain('nieruszony')
    expect(text).toMatch(/Zrobione\s*0%\s*jeszcze bez zadań/)
    expect(text).toMatch(/Skuteczność\s*–\s*pojawi się po pierwszym zadaniu/)
  })

  it('moves to a neighbouring station on the same line', async () => {
    const panel = open('wielomiany')
    const next = panel
      .findAll('button')
      .find((button) => button.text().includes('Wartość bezwzględna'))
    await next!.trigger('click')
    expect(panel.emitted('select')).toEqual([['wartosc-bezwzgledna']])
  })

  it('closes on Escape', () => {
    const panel = open('wykresy')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(panel.emitted('close')).toHaveLength(1)
  })
})
