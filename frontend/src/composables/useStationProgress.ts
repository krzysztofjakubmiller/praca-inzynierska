import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Pozycja czytającego na kolejnych przystankach, np. 1.25 to ćwierć drugiego przystanku,
 * a -1 oznacza, że żaden nie został jeszcze osiągnięty. `tops` są mierzone od linii czytania,
 * więc przystanek jest osiągnięty, gdy jego górna krawędź jest na niej lub wyżej.
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
 * Śledzi `stationPosition` podczas przewijania. `getLine` zwraca położenie linii czytania
 * od górnej krawędzi okna. `position` odświeża się raz na klatkę, a `readPosition` mierzy
 * stronę na żądanie, dla kodu, który sam liczy klatki.
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
