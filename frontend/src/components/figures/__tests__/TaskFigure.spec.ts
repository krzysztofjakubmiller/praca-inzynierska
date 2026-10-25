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

  it('draws circles with a dashed back half, dots and shaded double arcs', () => {
    const wrapper = draw({
      type: 'figura',
      points: { S: [0, 0], A: [3, 0], B: [0, 3] },
      circles: [{ center: 'S', radius: 3, radius_y: 1, back_dashed: true, fill: true }],
      dots: ['S'],
      angles: [{ vertex: 'S', from: 'A', to: 'B', fill: true, arcs: 2 }],
    })

    const halves = wrapper.findAll('path.plane-figure__line')
    expect(halves.map((half) => half.classes().includes('plane-figure__line--dashed'))).toEqual([
      true,
      false,
    ])
    expect(wrapper.find('ellipse.plane-figure__fill').exists()).toBe(true)
    expect(wrapper.findAll('.plane-figure__dot')).toHaveLength(1)
    expect(wrapper.findAll('.plane-figure__angle')).toHaveLength(2)
  })

  it('draws one bar per category in every panel of a bar chart', () => {
    const wrapper = draw({
      type: 'diagram-slupkowy',
      categories: ['1', '2', '3'],
      charts: [
        { title: 'klasa IV A', values: [1, 6, 3] },
        { title: 'klasa IV B', values: [2, 4, 5] },
      ],
      show_values: true,
    })

    expect(wrapper.findAll('svg.bar-chart__panel')).toHaveLength(2)
    expect(wrapper.findAll('.bar-chart__bar')).toHaveLength(6)
    expect(wrapper.text()).toContain('klasa IV B')
  })

  it('draws a pie slice for every value with its legend', () => {
    const wrapper = draw({
      type: 'diagram-kolowy',
      slices: [
        { value: 42, label: '42%', legend: 'jeden gol' },
        { value: 58, label: '58%', legend: 'dwa gole' },
      ],
    })

    expect(wrapper.findAll('.pie-chart__slice')).toHaveLength(2)
    expect(wrapper.findAll('.pie-chart__legend li').map((item) => item.text())).toEqual([
      'jeden gol',
      'dwa gole',
    ])
  })

  it('draws a table with a header cell spanning several columns', () => {
    const wrapper = draw({
      type: 'tabela',
      rows: [
        [{ text: 'Kartkówki', colspan: 3 }, 'Projekty'],
        ['$4$', '$4$', '$3$', '$2$'],
      ],
      header_rows: 1,
    })

    const header = wrapper.findAll('th')
    expect(header.map((cell) => cell.attributes('colspan'))).toEqual(['3', '1'])
    expect(wrapper.findAll('td')).toHaveLength(4)
    expect(wrapper.find('td .katex').exists()).toBe(true)
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

    expect(wrapper.findAll('path.plane-figure__line')).toHaveLength(12)
    expect(wrapper.findAll('.plane-figure__line--dashed')).toHaveLength(3)
    expect(wrapper.findAll('.figure-label')).toHaveLength(8)
  })

  it('hides the back edges of a pyramid and draws its marks', () => {
    const wrapper = draw({
      type: 'bryla',
      solid: 'ostroslup',
      n: 4,
      a: 6,
      h: 4,
      names: ['A', 'B', 'C', 'D', 'S'],
      points: { O: { midpoint: ['A', 'C'] }, M: { midpoint: ['B', 'C'] } },
      segments: [{ from: 'S', to: 'M' }],
      polygons: [{ points: ['S', 'O', 'M'], fill: true }],
      angles: [{ vertex: 'O', from: 'M', to: 'S', right: true }],
    })

    // 8 krawędzi i odcinek SM; zasłonięte są dwie tylne krawędzie podstawy i krawędź SD.
    expect(wrapper.findAll('path.plane-figure__line')).toHaveLength(10)
    expect(wrapper.findAll('.plane-figure__line--dashed')).toHaveLength(3)
    expect(wrapper.find('.plane-figure__fill').exists()).toBe(true)
    expect(wrapper.findAll('.plane-figure__dot')).toHaveLength(1)
  })

  it('draws a cylinder with the back half of its lower base dashed', () => {
    const wrapper = draw({ type: 'bryla', solid: 'walec', r: 2, h: 3 })

    expect(wrapper.findAll('path.plane-figure__line')).toHaveLength(6)
    expect(wrapper.findAll('.plane-figure__line--dashed')).toHaveLength(1)
  })

  it('marks a figure without a group as missing', () => {
    expect(draw({ type: 'nieznany' }).text()).toBe('Rysunek (jeszcze niedostępny)')
  })
})
