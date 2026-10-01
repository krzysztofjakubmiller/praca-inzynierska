import { beforeAll, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ExamMenu from '@/components/exam/ExamMenu.vue'
import router from '@/router'

// Router przewija stronę po każdej zmianie adresu, a jsdom nie umie przewijać.
beforeAll(() => vi.spyOn(window, 'scrollTo').mockImplementation(() => {}))

async function render() {
  await router.push('/matura-podstawowa')
  return mount(ExamMenu, { global: { plugins: [router] } })
}

describe('ExamMenu', () => {
  it('groups everything outside the map', async () => {
    const menu = await render()
    expect(menu.findAll('h2').map((heading) => heading.text())).toEqual([
      'Dziś',
      'Ćwiczenia',
      'Arkusze',
      'Postęp',
      'Materiały',
      'Egzaminy',
      'Konto',
    ])
  })

  it('marks the exam the student is on now', async () => {
    const current = (await render()).find('[aria-current="page"]')
    expect(current.text()).toBe('Matura podstawowa')
    expect(current.attributes('href')).toBe('/matura-podstawowa')
  })

  it('sends pages that do not exist yet to the coming soon page', async () => {
    const link = (await render()).findAll('a').find((item) => item.text() === 'Tryb losowy')
    expect(link?.attributes('href')).toBe('/wkrotce')
  })

  it('tells the drawer to close after a choice', async () => {
    const menu = await render()
    await menu.find('a').trigger('click')
    expect(menu.emitted('navigate')).toHaveLength(1)
  })
})
