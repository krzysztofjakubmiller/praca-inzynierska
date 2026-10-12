<script setup lang="ts">
import { computed } from 'vue'
import { besideSegment, centerOf, freeSpot, type Point, type SolidFigure } from '@/figures'
import FigureLabel from './FigureLabel.vue'

const props = defineProps<{ figure: SolidFigure }>()

const MAX_SIZE = 260
const PAD = 36
const LABEL_DISTANCE = 14
// Rzut ukośny jak w arkuszach CKE: głębokość pod kątem 45 stopni, skrócona o połowę.
const DEPTH = 0.5 * Math.SQRT1_2

// Wierzchołki A, B, C, D na dole i E, F, G, H nad nimi; x w prawo, y w głąb, z w górę.
const corners = computed(() => {
  const { a, b, h } = props.figure
  const base = [
    [0, 0],
    [a, 0],
    [a, b],
    [0, b],
  ]
  return [0, h].flatMap((z) => base.map(([x, y]) => [x! + y! * DEPTH, z + y! * DEPTH] as Point))
})

const EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const
// Przy tym kierunku patrzenia zasłonięty jest tylko tylny dolny lewy wierzchołek D.
const HIDDEN = 3

const scale = computed(() => {
  const xs = corners.value.map((corner) => corner[0])
  const ys = corners.value.map((corner) => corner[1])
  return MAX_SIZE / Math.max(Math.max(...xs), Math.max(...ys))
})
const top = computed(() => Math.max(...corners.value.map((corner) => corner[1])))

const points = computed(() =>
  corners.value.map(([x, y]): Point => [
    PAD + x * scale.value,
    PAD + (top.value - y) * scale.value,
  ]),
)
const width = computed(() => Math.max(...points.value.map((point) => point[0])) + PAD)
const height = computed(() => Math.max(...points.value.map((point) => point[1])) + PAD)
const center = computed(() => centerOf(points.value))

function neighbors(index: number): Point[] {
  return EDGES.filter(([from, to]) => from === index || to === index).map(
    ([from, to]) => points.value[from === index ? to : from]!,
  )
}

const names = computed(() => props.figure.names ?? [])
const corner = (name: string) => points.value[names.value.indexOf(name)]!
</script>

<template>
  <svg
    class="solid-figure"
    :viewBox="`0 0 ${width} ${height}`"
    :style="{ maxWidth: `${width}px` }"
    role="img"
    aria-label="Prostopadłościan"
  >
    <path
      v-for="[from, to] in EDGES"
      :key="`${from}${to}`"
      :d="`M${points[from]!.join(' ')} L${points[to]!.join(' ')}`"
      class="solid-figure__edge"
      :class="{ 'solid-figure__edge--hidden': from === HIDDEN || to === HIDDEN }"
    />
    <FigureLabel
      v-for="(name, index) in names"
      :key="name"
      :at="freeSpot(points[index]!, neighbors(index), center, LABEL_DISTANCE)"
      :text="`$${name}$`"
    />
    <FigureLabel
      v-for="edge in figure.edge_labels"
      :key="`${edge.from}${edge.to}`"
      :at="besideSegment(corner(edge.from), corner(edge.to), center, LABEL_DISTANCE)"
      :text="edge.label"
    />
  </svg>
</template>

<style scoped>
.solid-figure {
  display: block;
  width: 100%;
  color: var(--ink);
}

.solid-figure__edge {
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
}

.solid-figure__edge--hidden {
  stroke-dasharray: 6 5;
}
</style>
