<script setup lang="ts">
import { computed } from 'vue'
import { plural, shiftDay, shortDate } from '@/stats/stats'

const props = defineProps<{
  /** Zadania w kolejnych dniach, ostatni element to dziś. */
  days: readonly number[]
  today: string
  width: number
}>()

const LEFT = 26
const TOP = 34
const BOTTOM = 132

const last = computed(() => props.days.slice(-30))
const step = computed(() => (Math.max(10, ...last.value) > 20 ? 10 : 5))
const top = computed(() => Math.ceil(Math.max(10, ...last.value) / step.value) * step.value)
const ticks = computed(() =>
  Array.from({ length: top.value / step.value + 1 }, (_, index) => index * step.value),
)

const x = (index: number) => LEFT + 6 + (index * (props.width - LEFT - 12)) / 29
const y = (tasks: number) => BOTTOM - (tasks / top.value) * (BOTTOM - TOP)

const points = computed(() =>
  last.value.map((tasks, index) => ({
    tasks,
    day: shiftDay(props.today, index - 29),
    x: x(index),
    y: y(tasks),
  })),
)
const path = computed(() => `M${points.value.map((point) => `${point.x} ${point.y}`).join('L')}`)
const average = computed(() => last.value.reduce((sum, tasks) => sum + tasks, 0) / 30)
const summary = computed(
  () =>
    `Zadania w ostatnich 30 dniach, średnio ${Math.round(average.value)} dziennie, ` +
    `najwięcej ${Math.max(...last.value)} jednego dnia.`,
)
</script>

<template>
  <svg class="chart" :viewBox="`0 0 ${width} ${BOTTOM + 22}`" role="img" :aria-label="summary">
    <g v-for="tick in ticks" :key="tick">
      <line class="chart__grid" :x1="LEFT" :x2="width" :y1="y(tick)" :y2="y(tick)" />
      <text x="0" :y="y(tick) + 4">{{ tick }}</text>
    </g>
    <line class="daily__average" :x1="LEFT" :x2="width" :y1="y(average)" :y2="y(average)" />
    <line class="daily__average" x1="0" x2="18" y1="8" y2="8" />
    <text x="24" y="12">średnio {{ Math.round(average) }} dziennie</text>
    <path class="chart__ink-line" :d="path" stroke-width="2.5" />
    <g v-for="point in points" :key="point.day">
      <circle
        v-if="point.tasks > 0"
        class="chart__station"
        :cx="point.x"
        :cy="point.y"
        r="3.6"
        stroke-width="2"
      />
      <circle v-else class="chart__empty-day" :cx="point.x" :cy="point.y" r="2.4" />
      <title>
        {{ shortDate(point.day) }}: {{ point.tasks }}
        {{ plural(point.tasks, 'zadanie', 'zadania', 'zadań') }}
      </title>
    </g>
    <text
      v-for="index in [0, 7, 14, 21, 29]"
      :key="index"
      :x="x(index)"
      :y="BOTTOM + 18"
      :text-anchor="index === 0 ? 'start' : index === 29 ? 'end' : 'middle'"
    >
      {{ index === 29 ? 'dziś' : shortDate(points[index]!.day) }}
    </text>
  </svg>
</template>

<style scoped>
.daily__average {
  stroke: var(--map-outline);
  stroke-dasharray: 4 4;
}
</style>
