import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import { setTheme } from '@/theme'

const Page = { template: '<p>strona</p>' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/konto', name: 'account', component: Page },
      { path: '/matura-podstawowa', name: 'map', component: Page },
      { path: '/wizytowka', name: 'landing', component: Page },
      { path: '/wizytowka3/a35', name: 'landing-3', component: Page },
      { path: '/logowanie', name: 'login', component: Page },
      { path: '/platnosc', name: 'payment', component: Page },
      { path: '/panel', name: 'panel', component: Page, meta: { panel: true } },
    ],
  })
}

async function open(path: string) {
  const router = makeRouter()
  await router.push(path)
  mount(App, { global: { plugins: [router] } })
  await flushPromises()
}

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
  await setTheme('dark')
})

afterEach(async () => {
  await setTheme('light')
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('App theme', () => {
  it.each(['/konto', '/matura-podstawowa'])('darkens the app page %s', async (path) => {
    await open(path)

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.shade).toBe('grey')
  })

  it.each(['/wizytowka', '/wizytowka3/a35', '/logowanie', '/platnosc', '/panel'])(
    'keeps %s in its own colors',
    async (path) => {
      await open(path)

      expect(document.documentElement.dataset.theme).toBeUndefined()
    },
  )
})
