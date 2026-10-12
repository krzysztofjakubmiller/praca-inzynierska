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

  it('labels every number of a coordinate plane with a grid, zero only once', () => {
    const wrapper = draw({ type: 'uklad-wspolrzednych', x: [-2, 3], y: [-1, 2] })

    expect(wrapper.findAll('.coordinate-plane__grid path')).toHaveLength(6 + 4)
    expect(wrapper.findAll('.coordinate-plane__number').map((label) => label.text())).toEqual([
      '−2',
      '−1',
      '0',
      '1',
      '2',
      '3',
      '−1',
      '1',
      '2',
    ])
  })

  it('draws a schematic coordinate plane with only the given labels and a graph', () => {
    const wrapper = draw({
      type: 'uklad-wspolrzednych',
      x: [-2, 2],
      y: [-2, 2],
      grid: false,
      x_labels: [1],
      graphs: [
        {
          kind: 'kwadratowa',
          through: [
            [-1, 0],
            [0, -1],
            [1, 0],
          ],
        },
      ],
      texts: [{ text: '$y=f(x)$', at: [1, 1] }],
    })

    expect(wrapper.find('.coordinate-plane__grid').exists()).toBe(false)
    expect(wrapper.findAll('.coordinate-plane__number').map((label) => label.text())).toEqual(['1'])
    expect(wrapper.findAll('.coordinate-plane__graph')).toHaveLength(1)
    expect(wrapper.find('.katex').exists()).toBe(true)
  })

  it('enlarges a small coordinate plane without a grid', () => {
    const width = (grid: boolean) =>
      Number(
        draw({ type: 'uklad-wspolrzednych', x: [-2, 2], y: [-2, 2], grid })
          .find('svg')
          .attributes('viewBox')!
          .split(' ')[2],
      )

    expect(width(true)).toBe(28 + 4 * 32 + 19 + 28)
    expect(width(false)).toBe(28 + 256 + 19 + 28)
  })

  it('marks the ends of graph pieces with full or empty circles', () => {
    const wrapper = draw({
      type: 'uklad-wspolrzednych',
      x: [-6, 5],
      y: [-4, 5],
      graphs: [
        {
          kind: 'liniowa',
          through: [
            [-6, 2],
            [-3, 2],
          ],
          from: -6,
          to: -3,
          from_closed: true,
          to_closed: false,
        },
        {
          kind: 'liniowa',
          through: [
            [1, 5],
            [2, 5],
          ],
          from: 1,
          to: 2,
          from_closed: false,
        },
      ],
    })

    const ends = wrapper.findAll('.coordinate-plane__end')
    expect(ends.map((end) => end.classes().includes('coordinate-plane__end--closed'))).toEqual([
      true,
      false,
      false,
    ])
  })

  it('names the points of a plane figure and dashes the chosen segments', () => {
    const wrapper = draw({
      type: 'figura',
      points: { A: [0, 0], B: [4, 0], C: [4, 3] },
      names: ['A', 'C'],
      polygons: [{ points: ['A', 'B', 'C'], fill: true }],
      segments: [{ from: 'A', to: 'C', dashed: true, label: '$5$' }],
    })

    expect(wrapper.find('.plane-figure__fill').exists()).toBe(true)
    expect(wrapper.findAll('.plane-figure__line--dashed')).toHaveLength(1)
    // KaTeX zapisuje wzór kilka razy (wersja widoczna i dla czytników ekranu), więc liczy się początek.
    expect(wrapper.findAll('.figure-label').map((label) => label.text()[0])).toEqual([
      '5',
      'A',
      'C',
    ])
  })

  it('colors a background without outline and puts an arrow on a segment', () => {
    const wrapper = draw({
      type: 'figura',
      points: { A: [0, 0], B: [4, 0], C: [4, 3] },
      polygons: [{ points: ['A', 'B', 'C'], fill: 'niebieski', outline: false }],
      segments: [
        { from: 'A', to: 'C', arrow: true },
        { from: 'A', to: 'B' },
      ],
    })

    const background = wrapper.find('.plane-figure__fill--niebieski')
    expect(background.classes()).toContain('plane-figure__line--none')
    const segments = wrapper.findAll('path.plane-figure__line').slice(1)
    expect(segments.map((segment) => segment.attributes('marker-end') !== undefined)).toEqual([
      true,
      false,
    ])
  })

  it('marks angles of a plane figure with arcs and a right angle with a dot', () => {
    const wrapper = draw({
      type: 'figura',
      points: { A: [0, 0], B: [4, 0], C: [0, 3] },
      polygons: [{ points: ['A', 'B', 'C'] }],
      angles: [
        { vertex: 'A', from: 'B', to: 'C', right: true },
        { vertex: 'B', from: 'C', to: 'A', label: '$\\beta$' },
      ],
    })

    expect(wrapper.findAll('.plane-figure__angle')).toHaveLength(2)
    expect(wrapper.findAll('.plane-figure__dot')).toHaveLength(1)
    expect(wrapper.find('.katex').exists()).toBe(true)
  })

  it('draws a cuboid with the three edges at D dashed', () => {
    const wrapper = draw({
      type: 'bryla',
      solid: 'prostopadloscian',
      a: 2,
      b: 2,
      h: 3,
      names: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    })

    expect(wrapper.findAll('.solid-figure__edge')).toHaveLength(12)
    expect(wrapper.findAll('.solid-figure__edge--hidden')).toHaveLength(3)
    expect(wrapper.findAll('.figure-label')).toHaveLength(8)
  })

  it('marks a figure without a group as missing', () => {
    expect(draw({ type: 'nieznany' }).text()).toBe('Rysunek (jeszcze niedostępny)')
  })
})
