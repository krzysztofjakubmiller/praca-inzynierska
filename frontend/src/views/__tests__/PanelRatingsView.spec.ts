import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PanelRatingsView from '../PanelRatingsView.vue'
import { panelApi, type DifficultyRating } from '@/panel/api'
import router from '@/router'

const RATING: DifficultyRating = {
  solution_id: 1,
  task_id: 30,
  email: 'ola@example.com',
  created_at: '2026-11-09T15:00:00+00:00',
  student_rating: 'sredni',
  rating: 'sredni',
  reason: null,
  due: '2026-11-12T15:00:00+00:00',
}

const CHANGED: DifficultyRating = {
  ...RATING,
  solution_id: 2,
  student_rating: 'latwy',
  rating: 'trudny',
  reason: 'Bez podpowiedzi by nie doszedł.',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PanelRatingsView', () => {
  it('marks ratings changed after AI help and filters them on demand', async () => {
    const ratings = vi
      .spyOn(panelApi, 'ratings')
      .mockImplementation(async (changed) => (changed ? [CHANGED] : [RATING, CHANGED]))
    await router.push({ name: 'panel-ratings' })
    const wrapper = mount(PanelRatingsView, { global: { plugins: [router] } })
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.classes()).not.toContain('ratings__changed')
    expect(rows[1]!.classes()).toContain('ratings__changed')
    expect(rows[1]!.text()).toContain('łatwe')
    expect(rows[1]!.text()).toContain('trudne')
    expect(rows[1]!.text()).toContain('Bez podpowiedzi by nie doszedł.')

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await flushPromises()

    expect(ratings).toHaveBeenLastCalledWith(true)
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })
})
