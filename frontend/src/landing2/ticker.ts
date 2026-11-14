// Jedna pętla klatek dla wszystkich brył na stronie. Działa tylko wtedy, gdy ktoś jej słucha,
// a przeglądarka sama wstrzymuje ją w karcie w tle.

/** `seconds` to czas od poprzedniej klatki, `scrolled` to przewinięte w tym czasie piksele. */
export type Tick = (seconds: number, scrolled: number) => void

const ticks = new Set<Tick>()
let frame = 0
let lastTime = 0
let lastScroll = 0

function run(time: number) {
  frame = 0
  // Po przerwie (karta w tle) nie nadrabiamy całego czasu jednym skokiem.
  const seconds = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0.016
  lastTime = time
  const scroll = window.scrollY
  const scrolled = scroll - lastScroll
  lastScroll = scroll
  for (const tick of ticks) tick(seconds, scrolled)
  if (ticks.size) frame = requestAnimationFrame(run)
  else lastTime = 0
}

export function onTick(tick: Tick): () => void {
  ticks.add(tick)
  if (!frame) {
    lastScroll = window.scrollY
    frame = requestAnimationFrame(run)
  }
  return () => ticks.delete(tick)
}
