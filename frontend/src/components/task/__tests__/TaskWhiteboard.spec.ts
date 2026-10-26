import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskWhiteboard from '../TaskWhiteboard.vue'

// jsdom nie ma ResizeObserver, a tablica dopasowuje nim płótno do rozmiaru.
class NoResize {
  observe() {}
  disconnect() {}
}

afterEach(() => vi.unstubAllGlobals())

function render() {
  vi.stubGlobal('ResizeObserver', NoResize)
  return mount(TaskWhiteboard)
}

describe('TaskWhiteboard', () => {
  it('starts folded under the name "Tablica"', () => {
    const board = render()

    expect(board.find('summary').text()).toBe('Tablica')
    expect(board.find('details').attributes('open')).toBeUndefined()
  })

  it('switches between pen and eraser and between line widths', async () => {
    const board = render()
    const button = (label: string) => board.findAll('button').find((item) => item.text() === label)!

    expect(button('Pisak').attributes('aria-pressed')).toBe('true')
    await button('Gumka').trigger('click')
    await button('Gruba').trigger('click')

    expect(button('Pisak').attributes('aria-pressed')).toBe('false')
    expect(button('Gumka').attributes('aria-pressed')).toBe('true')
    expect(button('Gruba').attributes('aria-pressed')).toBe('true')
    expect(board.find('canvas').classes()).toContain('whiteboard__canvas--eraser')
  })
})
