<script setup lang="ts">
import { computed, useId } from 'vue'
import { besideSegment, centerOf, freeSpot, type PlaneFigure, type Point } from '@/figures'
import FigureLabel from './FigureLabel.vue'

const props = defineProps<{ figure: PlaneFigure }>()

// Jednostki z JSON-a są umowne, więc rysunek skalujemy do stałego rozmiaru.
const MAX_WIDTH = 420
const MAX_HEIGHT = 320
const PAD = 40
const LABEL_DISTANCE = 14

const arrowId = useId()

const bounds = computed(() => {
  const points = [
    ...Object.values(props.figure.points),
    ...(props.figure.dimensions ?? []).flatMap((dimension) => [dimension.from, dimension.to]),
    ...(props.figure.texts ?? []).map((text) => text.at),
    ...(props.figure.circles ?? []).flatMap((circle): Point[] => {
      const [x, y] = props.figure.points[circle.center]!
      const ry = circle.radius_y ?? circle.radius
      return [
        [x - circle.radius, y - ry],
        [x + circle.radius, y + ry],
      ]
    }),
  ]
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
})

const scale = computed(() => {
  const { minX, maxX, minY, maxY } = bounds.value
  return Math.min(MAX_WIDTH / (maxX - minX || 1), MAX_HEIGHT / (maxY - minY || 1))
})

const width = computed(() => (bounds.value.maxX - bounds.value.minX) * scale.value + 2 * PAD)
const height = computed(() => (bounds.value.maxY - bounds.value.minY) * scale.value + 2 * PAD)

const screen = (point: Point): Point => [
  PAD + (point[0] - bounds.value.minX) * scale.value,
  PAD + (bounds.value.maxY - point[1]) * scale.value,
]
const at = (name: string) => screen(props.figure.points[name]!)
const center = computed(() => centerOf(Object.values(props.figure.points).map(screen)))

// Sąsiedzi punktu to końce boków wielokątów i odcinków, które z niego wychodzą.
function neighbors(name: string): Point[] {
  const names = (props.figure.polygons ?? []).flatMap((polygon) => {
    const index = polygon.points.indexOf(name)
    if (index === -1) return []
    const count = polygon.points.length
    return [polygon.points[(index + 1) % count]!, polygon.points[(index + count - 1) % count]!]
  })
  for (const segment of props.figure.segments ?? []) {
    if (segment.from === name) names.push(segment.to)
    if (segment.to === name) names.push(segment.from)
  }
  return names.map(at)
}

// Okrąg rysowany jako dwie połówki, żeby u walca i stożka tylną połowę podstawy dało się
// narysować przerywaną.
const circles = computed(() =>
  (props.figure.circles ?? []).map((circle) => {
    const [cx, cy] = at(circle.center)
    const rx = circle.radius * scale.value
    const ry = (circle.radius_y ?? circle.radius) * scale.value
    const half = (sweep: number) => `M${cx - rx} ${cy} A${rx} ${ry} 0 0 ${sweep} ${cx + rx} ${cy}`
    return { cx, cy, rx, ry, back: half(1), front: half(0), circle }
  }),
)

// Łuk kąta po krótszej stronie, w rozmiarze niezależnym od skali rysunku.
const ANGLE_RADIUS = 22
const FILLED_RADIUS = 28
const SECOND_ARC = 4
const LABEL_INSIDE = 26
// Przy bardzo wąskim kącie napis nie mieści się między ramionami, a łuk nie może rosnąć bez
// końca, więc napis wtedy lekko na nie wchodzi, jak w arkuszach.
const LABEL_FARTHEST = 62
const CHARACTER_WIDTH = 8

// Przybliżona połowa szerokości napisu: polecenie LaTeX-a, np. \circ, liczy się jak jeden znak,
// a $, ^ i nawiasy klamrowe nie zajmują miejsca.
function halfWidth(text: string): number {
  const visible = text.replace(/\\[a-zA-Z]+/g, 'x').replace(/[${}^_]/g, '')
  return (Math.max(1, visible.length) * CHARACTER_WIDTH) / 2
}

const angles = computed(() =>
  (props.figure.angles ?? []).map((angle) => {
    const [vx, vy] = at(angle.vertex)
    const unit = (name: string): Point => {
      const [x, y] = at(name)
      const length = Math.hypot(x - vx, y - vy) || 1
      return [(x - vx) / length, (y - vy) / length]
    }
    const a = unit(angle.from)
    const b = unit(angle.to)
    const length = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1
    const along = (distance: number): Point => [
      vx + ((a[0] + b[0]) / length) * distance,
      vy + ((a[1] + b[1]) / length) * distance,
    ]
    // Na ekranie oś y idzie w dół, więc znak iloczynu wektorowego wybiera kierunek łuku.
    const sweep = a[0] * b[1] - a[1] * b[0] > 0 ? 1 : 0
    // Litera stoi wewnątrz łuku, więc przy wąskim kącie łuk musi być większy, żeby litera
    // zmieściła się między ramionami.
    const halfAngle = Math.acos(Math.min(1, length / 2))
    const half = angle.label ? halfWidth(angle.label) : 0
    const labelDistance = Math.min(
      LABEL_FARTHEST,
      Math.max(LABEL_INSIDE, half / Math.sin(halfAngle || 1)),
    )
    const r = angle.label ? labelDistance + 14 : angle.fill ? FILLED_RADIUS : ANGLE_RADIUS
    const arc = (radius: number) =>
      `M${vx + a[0] * radius} ${vy + a[1] * radius} A${radius} ${radius} 0 0 ${sweep} ${vx + b[0] * radius} ${vy + b[1] * radius}`
    return {
      arcs: angle.arcs === 2 ? [arc(r), arc(r + SECOND_ARC)] : [arc(r)],
      sector: angle.fill ? `M${vx} ${vy} L${arc(r).slice(1)} Z` : null,
      dot: angle.right ? along(r / 2) : null,
      label: angle.label ? { text: angle.label, at: along(labelDistance) } : null,
    }
  }),
)

const polygonPath = (names: string[]) => `M${names.map((name) => at(name).join(' ')).join(' L')} Z`
const linePath = (from: Point, to: Point) => `M${from.join(' ')} L${to.join(' ')}`
</script>

<template>
  <svg
    class="plane-figure"
    :viewBox="`0 0 ${width} ${height}`"
    :style="{ maxWidth: `${width}px` }"
    role="img"
    aria-label="Rysunek"
  >
    <defs>
      <marker
        :id="arrowId"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M0 0 L10 5 L0 10 z" class="plane-figure__arrow" />
      </marker>
    </defs>

    <template v-for="(item, index) in circles" :key="`c${index}`">
      <ellipse
        v-if="item.circle.fill"
        :cx="item.cx"
        :cy="item.cy"
        :rx="item.rx"
        :ry="item.ry"
        class="plane-figure__fill plane-figure__line--none"
      />
      <path
        :d="item.back"
        class="plane-figure__line"
        :class="{ 'plane-figure__line--dashed': item.circle.dashed || item.circle.back_dashed }"
      />
      <path
        :d="item.front"
        class="plane-figure__line"
        :class="{ 'plane-figure__line--dashed': item.circle.dashed }"
      />
    </template>

    <path
      v-for="(polygon, index) in figure.polygons"
      :key="`p${index}`"
      :d="polygonPath(polygon.points)"
      class="plane-figure__line"
      :class="{
        'plane-figure__fill': polygon.fill,
        [`plane-figure__fill--${polygon.fill}`]: typeof polygon.fill === 'string',
        'plane-figure__line--dashed': polygon.dashed,
        'plane-figure__line--none': polygon.outline === false,
      }"
    />
    <path
      v-for="(segment, index) in figure.segments"
      :key="`s${index}`"
      :d="linePath(at(segment.from), at(segment.to))"
      class="plane-figure__line"
      :class="{ 'plane-figure__line--dashed': segment.dashed }"
      :marker-end="segment.arrow ? `url(#${arrowId})` : undefined"
    />
    <path
      v-for="(dimension, index) in figure.dimensions"
      :key="`d${index}`"
      :d="linePath(screen(dimension.from), screen(dimension.to))"
      class="plane-figure__dimension"
      :marker-start="`url(#${arrowId})`"
      :marker-end="`url(#${arrowId})`"
    />

    <template v-for="(angle, index) in angles" :key="`a${index}`">
      <path
        v-if="angle.sector"
        :d="angle.sector"
        class="plane-figure__fill plane-figure__line--none"
      />
      <path v-for="arc in angle.arcs" :key="arc" :d="arc" class="plane-figure__angle" />
      <circle
        v-if="angle.dot"
        :cx="angle.dot[0]"
        :cy="angle.dot[1]"
        r="2"
        class="plane-figure__dot"
      />
      <FigureLabel v-if="angle.label" :at="angle.label.at" :text="angle.label.text" />
    </template>

    <template v-for="(segment, index) in figure.segments" :key="`sl${index}`">
      <FigureLabel
        v-if="segment.label"
        :at="besideSegment(at(segment.from), at(segment.to), center, LABEL_DISTANCE)"
        :text="segment.label"
      />
    </template>
    <FigureLabel
      v-for="(dimension, index) in figure.dimensions"
      :key="`dl${index}`"
      :at="besideSegment(screen(dimension.from), screen(dimension.to), center, LABEL_DISTANCE)"
      :text="dimension.label"
    />
    <circle
      v-for="name in figure.dots"
      :key="`k${name}`"
      :cx="at(name)[0]"
      :cy="at(name)[1]"
      r="2.5"
      class="plane-figure__dot"
    />
    <FigureLabel
      v-for="name in figure.names"
      :key="name"
      :at="freeSpot(at(name), neighbors(name), center, LABEL_DISTANCE)"
      :text="`$${name}$`"
    />
    <FigureLabel
      v-for="(text, index) in figure.texts"
      :key="`t${index}`"
      :at="screen(text.at)"
      :text="text.text"
    />
  </svg>
</template>

<style scoped>
.plane-figure {
  display: block;
  width: 100%;
  color: var(--ink);
}

.plane-figure__line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linejoin: round;
}

.plane-figure__line--dashed {
  stroke-dasharray: 7 5;
}

.plane-figure__line--none {
  stroke: none;
}

.plane-figure__fill {
  fill: var(--figure-color, currentColor);
  fill-opacity: 0.16;
}

/* Półprzezroczyste, więc pasują do jasnego i ciemnego tła. */
.plane-figure__fill--niebieski {
  fill: #3d8ad6;
  fill-opacity: 0.22;
}

.plane-figure__fill--zolty {
  fill: #e0b23a;
  fill-opacity: 0.3;
}

/* Zakrywa wypełnienie pod spodem, więc wnętrze figury wygląda jak puste tło. */
.plane-figure__fill--tlo {
  fill: var(--surface);
  fill-opacity: 1;
}

.plane-figure__dimension {
  stroke: currentColor;
  stroke-width: 1.1;
}

.plane-figure__angle {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.1;
}

.plane-figure__dot,
.plane-figure__arrow {
  fill: currentColor;
}
</style>
