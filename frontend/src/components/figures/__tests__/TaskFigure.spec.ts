import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskFigure from '../TaskFigure.vue'
import type { Figure } from '@/figures'

function draw(figure: Figure) {
  return mount(TaskFigure, { props: { figure } })
}

describe('TaskFigure', () => {
  it('draws ticks three beyond the outermost numbers and only the given labels', () => {
    const wrapper = draw({ type: 'os-liczbowa', labels: [-9, 0, 1] })

    expect(wrapper.findAll('.number-line__tick')).toHaveLength(17)
    expect(wrapper.findAll('.number-line__label').map((label) => label.text())).toEqual([
      '−9',
      '0',
      '1',
      'x',
    ])
  })

  it('draws a ray up to the edge with one closed end', () => {
    const wrapper = draw({
      type: 'os-liczbowa',
      intervals: [{ from: null, to: 3, to_closed: true }],
    })

    expect(wrapper.find('.number-line__band').attributes('x')).toBe('0')
    const ends = wrapper.findAll('.number-line__end')
    expect(ends).toHaveLength(1)
    expect(ends[0]!.classes()).toContain('number-line__end--closed')
  })

  it('draws open ends as empty circles', () => {
    const wrapper = draw({
      type: 'os-liczbowa',
      intervals: [{ from: -2, to: 1 }],
    })

    const ends = wrapper.findAll('.number-line__end')
    expect(ends).toHaveLength(2)
    expect(ends.some((end) => end.classes().includes('number-line__end--closed'))).toBe(false)
  })

  it('uses the shared range of the task when given', () => {
    const wrapper = mount(TaskFigure, {
      props: { figure: { type: 'os-liczbowa', labels: [0] }, range: { min: -12, max: 6 } },
    })

    expect(wrapper.findAll('.number-line__tick')).toHaveLength(19)
  })

  it('marks a figure without a group as missing', () => {
    expect(draw({ type: 'nieznany' }).text()).toBe('Rysunek (jeszcze niedostępny)')
  })
})
