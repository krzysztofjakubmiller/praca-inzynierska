<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { onTick } from '@/landing2/ticker'
import { miniMap } from '@/landing3/miniMap'
import { BASIC_MAP } from '@/maps'
import type { Point } from '@/maps/geometry'

// Pociąg z dwóch brył wjeżdża na środek, a potem jego wierzchołki i koła rozjeżdżają się
// na miejsca stacji mapy matury podstawowej. Punktów pociągu jest tyle samo co stacji.
const ROLL_S = 1.7
const HOLD_S = 0.45
const MORPH_S = 1.9
const YAW = 0.5
const PITCH = 0.3
const CAMERA = 9

const map = miniMap(BASIC_MAP, 'landscape')
const [boxX, boxY, boxW, boxH] = map.viewBox.split(' ').map(Number) as [
  number,
  number,
  number,
  number,
]

interface Point3 {
  x: number
  y: number
  z: number
}

const CAR = { length: 2.2, height: 1, depth: 0.9, floor: 0.38 }
const WHEEL = 0.2

// Osiem wierzchołków wagonu. Lokomotywa ma ścięty przód.
function car(from: number, nose: boolean): Point3[] {
  const corners: Point3[] = []
  for (const dx of [0, 1])
    for (const dy of [0, 1])
      for (const dz of [0, 1])
        corners.push({
          x: from + dx * CAR.length - (nose && dx && dy ? 0.6 : 0),
          y: CAR.floor + dy * CAR.height,
          z: (dz - 0.5) * CAR.depth,
        })
  return corners
}

function wheels(from: number): Point3[] {
  return [0.18, 0.5, 0.82].map((share) => ({
    x: from + share * CAR.length,
    y: WHEEL,
    z: CAR.depth / 2,
  }))
}

const WAGON_FROM = -2.35
const ENGINE_FROM = 0.15
const body = [...car(WAGON_FROM, false), ...car(ENGINE_FROM, true)]
const train = [...body, ...wheels(WAGON_FROM), ...wheels(ENGINE_FROM)]
const WHEELS_FROM = body.length

// Krawędzie wagonu łączą wierzchołki, które różnią się jedną współrzędną.
const edges: [number, number][] = []
for (const offset of [0, 8])
  for (let a = 0; a < 8; a++)
    for (const bit of [1, 2, 4]) if (!(a & bit)) edges.push([offset + a, offset + (a | bit)])

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const finished = ref(still)

let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let ratio = 1
let time = 0
let colors: string[] = []
let ink = '#fff'
let ground = '#101421'
// Która stacja czeka na który punkt pociągu.
let target: number[] = []
let stopTick: (() => void) | undefined
let resizeObserver: ResizeObserver | undefined
let viewObserver: IntersectionObserver | undefined

function ease(value: number): number {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2
}

function trainScale(): number {
  return Math.min(width * 0.66, 560) / 4.7
}

function project(point: Point3, shift: number): Point {
  const x = point.x * Math.cos(YAW) + point.z * Math.sin(YAW)
  const z = -point.x * Math.sin(YAW) + point.z * Math.cos(YAW)
  const y = point.y * Math.cos(PITCH) - z * Math.sin(PITCH)
  const depth = point.y * Math.sin(PITCH) + z * Math.cos(PITCH)
  const scale = (CAMERA / (CAMERA + depth)) * trainScale()
  return { x: width / 2 + shift + x * scale, y: height * 0.6 - y * scale }
}

function onMap(point: Point): Point {
  const scale = Math.min((width - 24) / boxW, (height - 24) / boxH)
  return {
    x: width / 2 + (point.x - boxX - boxW / 2) * scale,
    y: height / 2 + (point.y - boxY - boxH / 2) * scale,
  }
}

// Punkty pociągu i stacje ustawione od lewej do prawej trafiają na siebie po kolei,
// więc w czasie zamiany nikt nie przelatuje przez cały rysunek.
function pair() {
  const fromLeft = train
    .map((point, index) => ({ index, x: project(point, 0).x }))
    .sort((a, b) => a.x - b.x)
  const stations = map.stations
    .map((station, index) => ({ index, at: onMap(station.at) }))
    .sort((a, b) => a.at.x - b.at.x || a.at.y - b.at.y)
  target = []
  fromLeft.forEach((point, order) => (target[stations[order]!.index] = point.index))
}

function line(points: Point[], color: string, lineWidth: number, alpha: number) {
  if (!ctx || alpha <= 0) return
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  points.forEach((point, index) =>
    index ? ctx!.lineTo(point.x, point.y) : ctx!.moveTo(point.x, point.y),
  )
  ctx.stroke()
}

function draw() {
  if (!ctx || !width) return
  const rolled = Math.min(1, time / ROLL_S)
  const shift = -(width / 2 + trainScale() * 3) * (1 - rolled) ** 3
  const morph = ease(Math.max(0, Math.min(1, (time - ROLL_S - HOLD_S) / MORPH_S)))
  const settle = Math.max(0, (morph - 0.8) / 0.2)
  const scale = Math.min((width - 24) / boxW, (height - 24) / boxH)

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const from = train.map((point) => project(point, shift))
  const stationAt = map.stations.map((station) => onMap(station.at))
  // Położenie stacji w tej klatce: w drodze między punktem pociągu a miejscem na mapie.
  const now = stationAt.map((to, index) => {
    const start = from[target[index]!]!
    return { x: start.x + (to.x - start.x) * morph, y: start.y + (to.y - start.y) * morph }
  })
  const byPoint: Point[] = []
  target.forEach((pointIndex, station) => (byPoint[pointIndex] = now[station]!))

  const fade = Math.max(0, 1 - morph * 1.7)
  const rail = project({ x: 0, y: 0, z: CAR.depth / 2 }, 0).y
  line(
    [
      { x: 0, y: rail },
      { x: width, y: rail },
    ],
    ink,
    1.5,
    0.35 * fade,
  )
  for (const [a, b] of edges) line([byPoint[a]!, byPoint[b]!], ink, 2.5, fade)

  const index = new Map(map.stations.map((station, order) => [station.id, order]))
  const grow = Math.max(0, (morph - 0.15) / 0.85)
  map.lines.forEach((mapLine) => {
    const color = colors[mapLine.color - 1] ?? ink
    const lineWidth = Math.max(3, 7 * scale)
    line(
      mapLine.stations.map((id) => now[index.get(id)!]!),
      color,
      lineWidth,
      grow * (1 - settle),
    )
    line(mapLine.points.map(onMap), color, lineWidth, settle)
  })

  ctx.globalAlpha = 1
  map.stations.forEach((station, order) => {
    const at = now[order]!
    const wheel = target[order]! >= WHEELS_FROM
    const small = wheel ? WHEEL * trainScale() : 2.5
    const radius = small + (Math.max(4, 8 * scale) - small) * morph
    ctx!.beginPath()
    ctx!.arc(at.x, at.y, radius, 0, Math.PI * 2)
    ctx!.fillStyle = ground
    ctx!.fill()
    ctx!.lineWidth = 2.5
    ctx!.strokeStyle = ink
    ctx!.stroke()
    ctx!.globalAlpha = morph
    ctx!.strokeStyle = colors[station.color - 1] ?? ink
    ctx!.stroke()
    ctx!.globalAlpha = 1
    if (wheel && fade > 0) {
      // Szprycha pokazuje, że koło się toczy.
      const turn = (shift / (WHEEL * trainScale())) % (Math.PI * 2)
      ctx!.globalAlpha = fade
      ctx!.beginPath()
      ctx!.moveTo(at.x - Math.cos(turn) * radius, at.y - Math.sin(turn) * radius)
      ctx!.lineTo(at.x + Math.cos(turn) * radius, at.y + Math.sin(turn) * radius)
      ctx!.stroke()
      ctx!.globalAlpha = 1
    }
  })
}

function tick(seconds: number) {
  time += seconds
  draw()
  if (time >= ROLL_S + HOLD_S + MORPH_S) {
    stopTick?.()
    stopTick = undefined
    finished.value = true
  }
}

function play() {
  if (still) return
  stopTick?.()
  time = 0
  finished.value = false
  stopTick = onTick(tick)
}

function resize() {
  if (!canvas.value) return
  const style = getComputedStyle(canvas.value)
  colors = [1, 2, 3, 4].map((number) => style.getPropertyValue(`--line-${number}`).trim())
  ink = style.color
  ground = style.getPropertyValue('--train-ground').trim() || ground
  width = canvas.value.clientWidth
  height = canvas.value.clientHeight
  ratio = Math.min(window.devicePixelRatio, 2)
  canvas.value.width = Math.round(width * ratio)
  canvas.value.height = Math.round(height * ratio)
  pair()
  draw()
}

onMounted(() => {
  ctx = canvas.value!.getContext('2d')
  if (still) time = ROLL_S + HOLD_S + MORPH_S
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas.value!)
  viewObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      viewObserver?.disconnect()
      play()
    },
    { threshold: 0.4 },
  )
  viewObserver.observe(canvas.value!)
})

onBeforeUnmount(() => {
  stopTick?.()
  resizeObserver?.disconnect()
  viewObserver?.disconnect()
})
</script>

<template>
  <section class="train" aria-labelledby="train-title">
    <div class="train__head">
      <h2 id="train-title" class="train__title">Matma po kolei: od stacji do stacji</h2>
      <p class="train__text">
        Każdy temat matury to stacja, a każdy dział to linia. Na mapie widzisz całą trasę do
        egzaminu.
      </p>
    </div>
    <canvas
      ref="canvas"
      class="train__canvas"
      role="img"
      aria-label="Pociąg zamienia się w mapę tematów"
    />
    <div class="train__foot" :class="{ 'train__foot--shown': finished }">
      <ul class="train__lines">
        <li
          v-for="mapLine in map.lines"
          :key="mapLine.id"
          :style="{ '--dot': `var(--line-${mapLine.color})` }"
        >
          {{ mapLine.name }}
        </li>
      </ul>
      <button v-if="!still" class="button button--quiet train__again" type="button" @click="play">
        Jeszcze raz
      </button>
    </div>
  </section>
</template>

<style scoped>
.train {
  --ground: #101421;
  --train-ground: #101421;
  --ink: #fff;
  --ink-raised: #e8ecf8;
  --ink-soft: rgb(255 255 255 / 0.82);
  --line-1: #ffd35c;
  --line-2: #7fb0ff;
  --line-3: #4fd58d;
  --line-4: #ff7a69;
  display: grid;
  gap: clamp(1.25rem, 1rem + 1.5vw, 2rem);
  align-content: center;
  padding: clamp(2.5rem, 2rem + 3vw, 5rem) max(var(--gutter), calc((100vw - 70rem) / 2));
  background: var(--ground);
  color: var(--ink);
}

.train :focus-visible {
  outline-color: #fff;
}

.train__head {
  display: grid;
  gap: 0.8rem;
}

.train__title {
  max-width: 18ch;
  font-size: clamp(2rem, 1.5rem + 2.4vw, 3.4rem);
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.028em;
  line-height: 1;
  text-wrap: balance;
}

.train__text {
  max-width: 46ch;
  color: var(--ink-soft);
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.train__canvas {
  display: block;
  width: 100%;
  height: clamp(13rem, 46vw, 24rem);
  color: var(--ink);
}

.train__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  transition: opacity 0.6s ease;
}

.train__foot:not(.train__foot--shown) {
  opacity: 0;
}

.train__lines {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.25rem;
  padding: 0;
  font-weight: 650;
  list-style: none;
}

.train__lines li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.train__lines li::before {
  content: '';
  width: 1.5rem;
  height: 0.4rem;
  border-radius: 999px;
  background: var(--dot);
}
</style>
