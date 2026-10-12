<script setup lang="ts">
import { computed, useId } from 'vue'
import {
  throughPoints,
  type CoordinatePlaneFigure,
  type Graph,
  type PlaneSpan,
  type Point,
} from '@/figures'
import FigureLabel from './FigureLabel.vue'

// Bez span kratka ma dokładnie zakres z rysunku.
const props = defineProps<{ figure: CoordinatePlaneFigure; span?: PlaneSpan }>()

// Jednostki układu SVG na jedną kratkę; rysunek skaluje się do szerokości kontenera.
const UNIT = 32
// Układ bez kratki ma zwykle zakres kilku jednostek, więc przy UNIT wyszedłby za mały.
// Powiększa się go tak, żeby dłuższy bok miał co najmniej tyle jednostek SVG.
const MIN_SIDE = 256
const PAD = 28
// Osie wystają poza kratkę o tyle jednostek SVG, żeby zmieściły się groty i litery x, y.
const OVERHANG = 19

const clipId = useId()

// Brakujące kratki do wspólnej szerokości dokładamy po połowie z obu stron.
function widened([low, high]: Point, span: number | undefined): Point {
  const missing = Math.max(0, (span ?? 0) - (high - low))
  return [low - Math.floor(missing / 2), high + Math.ceil(missing / 2)]
}

const xRange = computed(() => widened(props.figure.x, props.span?.x))
const yRange = computed(() => widened(props.figure.y, props.span?.y))
const x0 = computed(() => xRange.value[0])
const x1 = computed(() => xRange.value[1])
const y0 = computed(() => yRange.value[0])
const y1 = computed(() => yRange.value[1])
const grid = computed(() => props.figure.grid ?? true)
const unit = computed(() =>
  grid.value ? UNIT : Math.max(UNIT, MIN_SIDE / Math.max(x1.value - x0.value, y1.value - y0.value)),
)

const sx = (x: number) => PAD + (x - x0.value) * unit.value
const sy = (y: number) => PAD + (y1.value - y) * unit.value
const screen = (point: Point): [number, number] => [sx(point[0]), sy(point[1])]

const width = computed(() => sx(x1.value) + OVERHANG + PAD)
const height = computed(() => sy(y0.value) + PAD)

function integers(from: number, to: number): number[] {
  const values = []
  for (let value = from; value <= to; value++) values.push(value)
  return values
}

// Przy kratce podpisane są wszystkie liczby, bez kratki tylko te z listy; zero raz, przy początku.
const xLabels = computed(
  () => props.figure.x_labels ?? (grid.value ? integers(x0.value, x1.value) : []),
)
const yLabels = computed(() =>
  (props.figure.y_labels ?? (grid.value ? integers(y0.value, y1.value) : [])).filter(
    (value) => value !== 0,
  ),
)
const xTicks = computed(() => (grid.value ? integers(x0.value, x1.value) : xLabels.value))
const yTicks = computed(() => (grid.value ? integers(y0.value, y1.value) : yLabels.value))

function number(value: number): string {
  return value < 0 ? `−${-value}` : String(value)
}

function graphPath(graph: Graph): string {
  // Wykres liczony trochę poza kratką; obcina go clipPath.
  const from = Math.max(graph.from ?? -Infinity, x0.value - 1)
  const to = Math.min(graph.to ?? Infinity, x1.value + 1)
  const f = throughPoints(graph.through)
  const steps = graph.kind === 'liniowa' ? 1 : 200
  const points = []
  for (let step = 0; step <= steps; step++) {
    const x = from + ((to - from) * step) / steps
    points.push(`${sx(x).toFixed(1)} ${sy(f(x)).toFixed(1)}`)
  }
  return `M${points.join(' L')}`
}

// Kółka na końcach fragmentów wykresów, w miejscu, gdzie fragment się kończy.
const graphEnds = computed(() =>
  (props.figure.graphs ?? []).flatMap((graph) => {
    const f = throughPoints(graph.through)
    return [
      { x: graph.from, closed: graph.from_closed },
      { x: graph.to, closed: graph.to_closed },
    ]
      .filter((end) => end.x != null && end.closed != null)
      .map((end) => ({ point: screen([end.x!, f(end.x!)]), closed: end.closed! }))
  }),
)

// Łuk zawsze po krótszej stronie, od ramienia from do ramienia to.
function anglePath(angle: { vertex: Point; from: Point; to: Point; radius?: number }): string {
  const radius = angle.radius ?? 1
  const start = Math.atan2(angle.from[1] - angle.vertex[1], angle.from[0] - angle.vertex[0])
  const end = Math.atan2(angle.to[1] - angle.vertex[1], angle.to[0] - angle.vertex[0])
  let sweep = end - start
  if (sweep > Math.PI) sweep -= 2 * Math.PI
  if (sweep <= -Math.PI) sweep += 2 * Math.PI
  const [ax, ay] = screen([
    angle.vertex[0] + radius * Math.cos(start),
    angle.vertex[1] + radius * Math.sin(start),
  ])
  const [bx, by] = screen([
    angle.vertex[0] + radius * Math.cos(start + sweep),
    angle.vertex[1] + radius * Math.sin(start + sweep),
  ])
  // Oś y na ekranie idzie w dół, więc obrót przeciwny do wskazówek zegara ma flagę 0.
  return `M${ax} ${ay} A${radius * unit.value} ${radius * unit.value} 0 0 ${sweep > 0 ? 0 : 1} ${bx} ${by}`
}
</script>

<template>
  <svg
    class="coordinate-plane"
    :viewBox="`0 0 ${width} ${height}`"
    :style="{ maxWidth: `${width}px` }"
    role="img"
    aria-label="Układ współrzędnych"
  >
    <defs>
      <clipPath :id="clipId">
        <rect :x="sx(x0)" :y="sy(y1)" :width="(x1 - x0) * unit" :height="(y1 - y0) * unit" />
      </clipPath>
    </defs>

    <g v-if="grid" class="coordinate-plane__grid">
      <path v-for="x in integers(x0, x1)" :key="`x${x}`" :d="`M${sx(x)} ${sy(y1)} V${sy(y0)}`" />
      <path v-for="y in integers(y0, y1)" :key="`y${y}`" :d="`M${sx(x0)} ${sy(y)} H${sx(x1)}`" />
    </g>

    <path :d="`M${sx(x0)} ${sy(0)} H${sx(x1) + OVERHANG}`" class="coordinate-plane__axis" />
    <path :d="`M${sx(0)} ${sy(y0)} V${sy(y1) - OVERHANG}`" class="coordinate-plane__axis" />
    <path :d="`M${sx(x1) + OVERHANG} ${sy(0)} l-10 -4 v8 z`" class="coordinate-plane__arrow" />
    <path :d="`M${sx(0)} ${sy(y1) - OVERHANG} l-4 10 h8 z`" class="coordinate-plane__arrow" />
    <path
      v-for="x in xTicks"
      :key="`tx${x}`"
      :d="`M${sx(x)} ${sy(0) - 4} V${sy(0) + 4}`"
      class="coordinate-plane__axis"
    />
    <path
      v-for="y in yTicks"
      :key="`ty${y}`"
      :d="`M${sx(0) - 4} ${sy(y)} H${sx(0) + 4}`"
      class="coordinate-plane__axis"
    />

    <text
      v-for="x in xLabels"
      :key="`lx${x}`"
      :x="x === 0 ? sx(0) - 8 : sx(x) - 4"
      :y="sy(0) + 18"
      class="coordinate-plane__number"
    >
      {{ number(x) }}
    </text>
    <text
      v-for="y in yLabels"
      :key="`ly${y}`"
      :x="sx(0) - 8"
      :y="sy(y) + 5"
      class="coordinate-plane__number coordinate-plane__number--y"
    >
      {{ number(y) }}
    </text>
    <text :x="sx(x1) + OVERHANG - 4" :y="sy(0) + 20" class="coordinate-plane__variable">x</text>
    <text :x="sx(0) + 12" :y="sy(y1) - OVERHANG + 8" class="coordinate-plane__variable">y</text>

    <g :clip-path="`url(#${clipId})`">
      <path
        v-for="(graph, index) in figure.graphs"
        :key="index"
        :d="graphPath(graph)"
        class="coordinate-plane__graph"
      />
    </g>
    <path
      v-for="(angle, index) in figure.angles"
      :key="index"
      :d="anglePath(angle)"
      class="coordinate-plane__angle"
    />
    <circle
      v-for="(end, index) in graphEnds"
      :key="`e${index}`"
      :cx="end.point[0]"
      :cy="end.point[1]"
      r="4"
      class="coordinate-plane__end"
      :class="{ 'coordinate-plane__end--closed': end.closed }"
    />
    <circle
      v-for="(point, index) in figure.points"
      :key="index"
      :cx="sx(point[0])"
      :cy="sy(point[1])"
      r="3.5"
      class="coordinate-plane__point"
    />
    <FigureLabel
      v-for="(text, index) in figure.texts"
      :key="index"
      :at="screen(text.at)"
      :text="text.text"
    />
  </svg>
</template>

<style scoped>
.coordinate-plane {
  display: block;
  width: 100%;
  color: var(--ink);
}

.coordinate-plane__grid {
  stroke: var(--hairline);
  stroke-width: 1;
}

.coordinate-plane__axis {
  stroke: currentColor;
  stroke-width: 1.3;
}

.coordinate-plane__arrow,
.coordinate-plane__point {
  fill: currentColor;
}

.coordinate-plane__number,
.coordinate-plane__variable {
  fill: currentColor;
  font-family: KaTeX_Main, 'Times New Roman', serif;
  font-size: 15px;
}

.coordinate-plane__number {
  text-anchor: middle;
}

.coordinate-plane__number--y {
  text-anchor: end;
}

.coordinate-plane__variable {
  font-size: 17px;
  font-style: italic;
  text-anchor: middle;
}

.coordinate-plane__graph {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
}

.coordinate-plane__end {
  fill: var(--surface);
  stroke: currentColor;
  stroke-width: 1.8;
}

.coordinate-plane__end--closed {
  fill: currentColor;
}

.coordinate-plane__angle {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
}
</style>
