<script setup lang="ts">
import { computed, useId } from 'vue'
import {
  centerOf,
  clearance,
  clearestSpot,
  spotsAround,
  spotsBeside,
  type Line,
  type PlaneFigure,
  type Point,
} from '@/figures'
import FigureLabel from './FigureLabel.vue'

const props = defineProps<{ figure: PlaneFigure }>()

// Jednostki z JSON-a są umowne, więc rysunek skalujemy do stałego rozmiaru.
const MAX_WIDTH = 420
const MAX_HEIGHT = 320
const PAD = 40
const LABEL_DISTANCE = 14
// Tyle pikseli wolnego miejsca potrzebuje litera przy punkcie.
const NAME_ROOM = 12

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

// Każdy kąt to zacieniowany wycinek w kolorze arkusza, w rozmiarze niezależnym od skali rysunku.
const ANGLE_RADIUS = 30
const SECOND_ARC = 4
// Przy bardzo wąskim kącie napis nie mieści się między ramionami, a łuk nie może rosnąć bez
// końca, więc napis wtedy lekko na nie wchodzi, jak w arkuszach.
const LABEL_FARTHEST = 90
// Wymiary napisu w pikselach przy czcionce 16 px z FigureLabel.vue.
const CHARACTER_WIDTH = 9
const DEGREE_WIDTH = 5
const LABEL_HALF_HEIGHT = 8

// Przybliżona połowa szerokości napisu: polecenie LaTeX-a, np. \alpha, liczy się jak jeden znak,
// stopień jak pół znaku, a $, ^, spacje i nawiasy klamrowe nie zajmują miejsca.
function halfWidth(text: string): number {
  const degrees = (text.match(/\\circ/g) ?? []).length
  const visible = text
    .replace(/\\circ/g, '')
    .replace(/\\[a-zA-Z]+/g, 'x')
    .replace(/[${}^_\s]/g, '')
  return (Math.max(1, visible.length) * CHARACTER_WIDTH + degrees * DEGREE_WIDTH) / 2
}

// Promień koła, w którym mieści się napis.
const labelRadius = (text: string) => Math.hypot(halfWidth(text), LABEL_HALF_HEIGHT)

// Napis jako przeszkoda: poziomy odcinek o jego szerokości.
const textLine = (at: Point, text: string): Line => [
  [at[0] - halfWidth(text), at[1]],
  [at[0] + halfWidth(text), at[1]],
]

const angles = computed(() =>
  (props.figure.angles ?? []).map((angle) => {
    const vertex = at(angle.vertex)
    const [vx, vy] = vertex
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
    // Napis stoi wewnątrz łuku: przy wąskim kącie trzeba go odsunąć od wierzchołka, żeby całe
    // koło napisu zmieściło się między ramionami, a łuk idzie tuż za napisem.
    const halfAngle = Math.acos(Math.min(1, length / 2))
    const radius = angle.label ? labelRadius(angle.label) : 0
    const labelDistance = Math.min(
      LABEL_FARTHEST,
      Math.max(radius + 6, (radius + 2) / Math.sin(halfAngle || 1)),
    )
    const r = angle.label ? Math.max(ANGLE_RADIUS, labelDistance + radius + 2) : ANGLE_RADIUS
    const arcPoint = (t: number, size: number): Point => {
      const x = a[0] * (1 - t) + b[0] * t
      const y = a[1] * (1 - t) + b[1] * t
      const norm = Math.hypot(x, y) || 1
      return [vx + (x / norm) * size, vy + (y / norm) * size]
    }
    const arc = (size: number) =>
      `M${vx + a[0] * size} ${vy + a[1] * size} A${size} ${size} 0 0 ${sweep} ${vx + b[0] * size} ${vy + b[1] * size}`
    // Łuk i dwusieczna jako linie, żeby nazwa wierzchołka nie stanęła w środku kąta.
    const obstacles: Line[] = [
      [vertex, along(r)],
      ...[0, 0.25, 0.5, 0.75].map((t): Line => [arcPoint(t, r), arcPoint(t + 0.25, r)]),
    ]
    return {
      arcs: angle.arcs === 2 ? [arc(r), arc(r + SECOND_ARC)] : [arc(r)],
      sector: `M${vx} ${vy} L${arc(r).slice(1)} Z`,
      dot: angle.right ? along(r / 2) : null,
      label: angle.label ? { text: angle.label, at: along(labelDistance) } : null,
      obstacles,
    }
  }),
)

// Wszystkie linie rysunku, od których napisy trzymają się z daleka. Okrąg i elipsa są
// przybliżone łamaną, a stały napis z texts jest punktem.
const lines = computed((): Line[] => {
  const edges = (props.figure.polygons ?? []).flatMap((polygon) =>
    polygon.points.map((name, index): Line => [
      at(name),
      at(polygon.points[(index + 1) % polygon.points.length]!),
    ]),
  )
  const outlines = circles.value.flatMap(({ cx, cy, rx, ry }) =>
    Array.from({ length: 36 }, (_, index): Line => {
      const t1 = (index * Math.PI) / 18
      const t2 = ((index + 1) * Math.PI) / 18
      return [
        [cx + rx * Math.cos(t1), cy + ry * Math.sin(t1)],
        [cx + rx * Math.cos(t2), cy + ry * Math.sin(t2)],
      ]
    }),
  )
  return [
    ...edges,
    ...(props.figure.segments ?? []).map((segment): Line => [at(segment.from), at(segment.to)]),
    ...(props.figure.dimensions ?? []).map((dimension): Line => [
      screen(dimension.from),
      screen(dimension.to),
    ]),
    ...outlines,
    ...angles.value.flatMap((angle) => angle.obstacles),
    ...angles.value.flatMap((angle) =>
      angle.label ? [textLine(angle.label.at, angle.label.text)] : [],
    ),
    ...(props.figure.texts ?? []).map((text) => textLine(screen(text.at), text.text)),
  ]
})

// Napisy stawiane po kolei: każdy postawiony napis jest przeszkodą dla następnych.
const labels = computed(() => {
  const taken = [...lines.value]
  const place = (candidates: Point[], text: string) => {
    const spot = clearestSpot(candidates, taken)
    taken.push(textLine(spot, text))
    return spot
  }
  const segments = (props.figure.segments ?? []).flatMap((segment) =>
    segment.label
      ? [
          {
            text: segment.label,
            at: place(
              spotsBeside(at(segment.from), at(segment.to), center.value, LABEL_DISTANCE),
              segment.label,
            ),
          },
        ]
      : [],
  )
  const dimensions = (props.figure.dimensions ?? []).map((dimension) => ({
    text: dimension.label,
    at: place(
      spotsBeside(screen(dimension.from), screen(dimension.to), center.value, LABEL_DISTANCE),
      dimension.label,
    ),
  }))
  // Gdy przez punkt przechodzi kilka linii, przy samym punkcie nie ma miejsca na literę, więc
  // dopiero wtedy odsuwamy ją dalej.
  const names = (props.figure.names ?? []).map((name) => {
    const near = clearestSpot(spotsAround(at(name), center.value, LABEL_DISTANCE), taken)
    const roomy = clearance(near, taken) >= NAME_ROOM
    const distance = roomy ? LABEL_DISTANCE : LABEL_DISTANCE * 1.5
    return {
      text: `$${name}$`,
      at: place(spotsAround(at(name), center.value, distance), name),
    }
  })
  return [...segments, ...dimensions, ...names]
})

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
      <path :d="angle.sector" class="plane-figure__fill plane-figure__line--none" />
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

    <circle
      v-for="name in figure.dots"
      :key="`k${name}`"
      :cx="at(name)[0]"
      :cy="at(name)[1]"
      r="2.5"
      class="plane-figure__dot"
    />
    <FigureLabel
      v-for="(label, index) in labels"
      :key="`l${index}`"
      :at="label.at"
      :text="label.text"
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
