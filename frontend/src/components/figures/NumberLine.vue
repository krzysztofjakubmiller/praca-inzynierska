<script setup lang="ts">
import { computed } from 'vue'
import { numberLineRange, type NumberLineFigure, type Range } from '@/figures'

// Bez range oś dostaje zakres tylko ze swoich liczb.
const props = defineProps<{ figure: NumberLineFigure; range?: Range }>()

// Jednostki układu SVG; rysunek skaluje się do szerokości kontenera.
const UNIT = 30
const LEFT = 12
const AXIS_Y = 48
const TOP = 16
const HEIGHT = 84

const range = computed(() => props.range ?? numberLineRange([props.figure]))
const x = (value: number) => LEFT + (value - range.value.min) * UNIT
const axisEnd = computed(() => x(range.value.max) + UNIT)
const width = computed(() => axisEnd.value + 8)

const ticks = computed(() => {
  const values = []
  for (let value = range.value.min; value <= range.value.max; value++) values.push(value)
  return values
})

// Przedział bez końca sięga brzegu osi; po prawej kończy się przed grotem strzałki.
const intervals = computed(() =>
  (props.figure.intervals ?? []).map((interval) => ({
    left: interval.from == null ? 0 : x(interval.from),
    right: interval.to == null ? axisEnd.value - 14 : x(interval.to),
    ends: [
      { value: interval.from, closed: interval.from_closed },
      { value: interval.to, closed: interval.to_closed },
    ].filter((end): end is { value: number; closed: boolean | undefined } => end.value != null),
  })),
)

// Typograficzny minus zamiast łącznika, tak jak w KaTeX.
function label(value: number): string {
  return value < 0 ? `−${-value}` : String(value)
}
</script>

<template>
  <svg
    class="number-line"
    :viewBox="`0 0 ${width} ${HEIGHT}`"
    :style="{ maxWidth: `${width}px` }"
    role="img"
    aria-label="Oś liczbowa"
  >
    <g v-for="(interval, index) in intervals" :key="index" class="number-line__interval">
      <rect
        :x="interval.left"
        :y="TOP"
        :width="interval.right - interval.left"
        :height="AXIS_Y - TOP"
        class="number-line__band"
      />
      <path :d="`M${interval.left} ${TOP} H${interval.right}`" class="number-line__edge" />
      <path
        v-for="end in interval.ends"
        :key="end.value"
        :d="`M${x(end.value)} ${TOP} V${AXIS_Y}`"
        class="number-line__edge"
      />
    </g>

    <path :d="`M0 ${AXIS_Y} H${axisEnd - 2}`" class="number-line__axis" />
    <path :d="`M${axisEnd} ${AXIS_Y} l-11 -4.5 v9 z`" class="number-line__arrow" />
    <path
      v-for="value in ticks"
      :key="value"
      :d="`M${x(value)} ${AXIS_Y - 5} V${AXIS_Y + 5}`"
      class="number-line__tick"
    />
    <text
      v-for="value in figure.labels"
      :key="value"
      :x="x(value)"
      :y="AXIS_Y + 27"
      class="number-line__label"
    >
      {{ label(value) }}
    </text>
    <text :x="axisEnd - 8" :y="AXIS_Y + 27" class="number-line__label number-line__variable">
      x
    </text>

    <template v-for="(interval, index) in intervals" :key="index">
      <circle
        v-for="end in interval.ends"
        :key="end.value"
        :cx="x(end.value)"
        :cy="AXIS_Y"
        r="4.5"
        class="number-line__end"
        :class="{ 'number-line__end--closed': end.closed }"
      />
    </template>
  </svg>
</template>

<style scoped>
.number-line {
  display: block;
  width: 100%;
  color: var(--ink);
}

.number-line__band {
  fill: var(--figure-color, currentColor);
  fill-opacity: 0.16;
}

.number-line__edge {
  stroke: var(--figure-color, currentColor);
  stroke-width: 2;
}

.number-line__axis {
  stroke: currentColor;
  stroke-width: 1.5;
}

.number-line__arrow {
  fill: currentColor;
}

.number-line__tick {
  stroke: currentColor;
  stroke-width: 1.2;
}

.number-line__label {
  fill: currentColor;
  font-family: KaTeX_Main, 'Times New Roman', serif;
  font-size: 21px;
  text-anchor: middle;
}

.number-line__variable {
  font-style: italic;
}

.number-line__end {
  fill: var(--surface);
  stroke: var(--figure-color, currentColor);
  stroke-width: 2;
}

.number-line__end--closed {
  fill: var(--figure-color, currentColor);
}
</style>
