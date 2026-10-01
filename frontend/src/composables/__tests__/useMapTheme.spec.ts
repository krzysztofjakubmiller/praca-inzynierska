import { afterEach, describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import { loadMapTheme, setMapTheme, useMapTheme } from '@/composables/useMapTheme'

const Page = defineComponent({
  setup() {
    useMapTheme()
    return () => h('div')
  },
})

afterEach(() => {
  setMapTheme('light')
  localStorage.clear()
})

describe('useMapTheme', () => {
  it('starts light when nothing was chosen', () => {
    localStorage.clear()
    expect(loadMapTheme()).toBe('light')
  })

  it('remembers the dark theme', () => {
    setMapTheme('dark')
    expect(loadMapTheme()).toBe('dark')
  })

  it('darkens only the page that uses it', async () => {
    setMapTheme('dark')
    const page = mount(Page)
    expect(document.documentElement.dataset.theme).toBe('dark')

    setMapTheme('light')
    await nextTick()
    expect(document.documentElement.dataset.theme).toBe('light')

    page.unmount()
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })
})
