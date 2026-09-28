import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Position of the reader along consecutive stops, e.g. 1.25 means a quarter of the way
 * through the second stop and -1 means no stop has been reached yet.
 * `tops` are measured from the reading line, so a stop is reached once its top is at or above it.
 */
export function stationPosition(tops: number[], heights: number[]): number {
  let reached = -1
  tops.forEach((top, index) => {
    if (top <= 0) reached = index
  })
  if (reached === -1) return -1
  const top = tops[reached]!
  const height = Math.max(1, heights[reached]!)
  return reached + Math.min(1, -top / height)
}

/**
 * Tracks `stationPosition` while the page scrolls. `getLine` returns the reading line
 * as a distance from the top of the viewport. `position` is updated once per frame;
 * `readPosition` measures the page on demand, for code that runs its own frames.
 */
export function useStationProgress(getStops: () => HTMLElement[], getLine: () => number) {
  const position = ref(-1)
  let frame = 0

  function readPosition(): number {
    const line = getLine()
    const rects = getStops().map((stop) => stop.getBoundingClientRect())
    return stationPosition(
      rects.map((rect) => rect.top - line),
      rects.map((rect) => rect.height),
    )
  }

  function measure() {
    frame = 0
    position.value = readPosition()
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(measure)
  }

  onMounted(() => {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    measure()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    if (frame) cancelAnimationFrame(frame)
  })

  return { position, readPosition }
}
