<script setup lang="ts">
import { computed } from 'vue'
import { monthName, plural, shiftDay, shortDate } from '@/stats/stats'

const props = defineProps<{
  /** Zadania w kolejnych dniach, ostatni element to dziś. */
  days: readonly number[]
  /** Dzisiejsza data w formacie RRRR-MM-DD. */
  today: string
  width: number
}>()

const LABELS = 24
const TOP = 18
const GAP = 3

// Poziom koloru kafelka: brak nauki, potem coraz ciemniej co kilka zadań.
function level(tasks: number): number {
  if (tasks === 0) return 0
  if (tasks < 4) return 1
  if (tasks < 9) return 2
  if (tasks < 16) return 3
  return 4
}

// Wiersze to dni tygodnia od poniedziałku, kolumny to tygodnie; ostatnia kolumna kończy się dziś.
const cells = computed(() => {
  const first = shiftDay(props.today, 1 - props.days.length)
  const offset = (new Date(`${first}T12:00`).getDay() + 6) % 7
  return props.days.map((tasks, index) => {
    const place = index + offset
    const day = shiftDay(first, index)
    return { day, tasks, level: level(tasks), column: Math.floor(place / 7), row: place % 7 }
  })
})

const lastCell = computed(() => cells.value[cells.value.length - 1]!)
const columns = computed(() => lastCell.value.column + 1)
const step = computed(() => Math.min(22, (props.width - LABELS) / columns.value))
const size = computed(() => step.value - GAP)
const height = computed(() => TOP + 7 * step.value + 30)

// Nazwa miesiąca nad tygodniem, w którym się zaczyna. Dwie nazwy bliżej niż trzy tygodnie
// weszłyby na siebie, więc wtedy wypada starsza (zwykle ucięty miesiąc na początku).
const months = computed(() => {
  const firstColumns = new Map<string, number>()
  for (const cell of cells.value) {
    if (!firstColumns.has(monthName(cell.day))) firstColumns.set(monthName(cell.day), cell.column)
  }
  const labels: { column: number; name: string }[] = []
  for (const [name, column] of [...firstColumns].reverse()) {
    const next = labels[0]
    if (!next || next.column - column >= 3) labels.unshift({ column, name })
  }
  return labels
})

const activeDays = computed(() => props.days.filter((tasks) => tasks > 0).length)
const total = computed(() => props.days.reduce((sum, tasks) => sum + tasks, 0))
const summary = computed(
  () =>
    `Nauka w ostatnich ${columns.value} tygodniach: ${activeDays.value} ` +
    `${plural(activeDays.value, 'dzień', 'dni', 'dni')}, ${total.value} ` +
    `${plural(total.value, 'zadanie', 'zadania', 'zadań')}.`,
)
</script>

<template>
  <svg class="chart" :viewBox="`0 0 ${width} ${height}`" role="img" :aria-label="summary">
    <text v-for="month in months" :key="month.column" :x="LABELS + month.column * step" y="11">
      {{ month.name }}
    </text>
    <text
      v-for="(name, row) in ['Pn', 'Śr', 'Pt']"
      :key="name"
      x="0"
      :y="TOP + row * 2 * step + size / 2 + 4"
    >
      {{ name }}
    </text>
    <rect
      v-for="cell in cells"
      :key="cell.day"
      class="heatmap__cell"
      :class="`heatmap__cell--${cell.level}`"
      :x="LABELS + cell.column * step"
      :y="TOP + cell.row * step"
      :width="size"
      :height="size"
      rx="3"
    >
      <title>
        {{ shortDate(cell.day) }}: {{ cell.tasks }}
        {{ plural(cell.tasks, 'zadanie', 'zadania', 'zadań') }}
      </title>
    </rect>
    <rect
      class="heatmap__today"
      :x="LABELS + lastCell.column * step - 2"
      :y="TOP + lastCell.row * step - 2"
      :width="size + 4"
      :height="size + 4"
      rx="5"
    />
    <g :transform="`translate(${width - 5 * 16 - 76} ${height - 13})`">
      <text x="0" y="10">mniej</text>
      <rect
        v-for="value in 5"
        :key="value"
        class="heatmap__cell"
        :class="`heatmap__cell--${value - 1}`"
        :x="36 + (value - 1) * 16"
        y="0"
        width="13"
        height="13"
        rx="3"
      />
      <text :x="36 + 5 * 16 + 4" y="10">więcej</text>
    </g>
  </svg>
</template>

<style scoped>
.heatmap__cell {
  fill: var(--ink);
}

.heatmap__cell--0 {
  fill: var(--hairline);
}

.heatmap__cell--1 {
  fill-opacity: 0.22;
}

.heatmap__cell--2 {
  fill-opacity: 0.45;
}

.heatmap__cell--3 {
  fill-opacity: 0.72;
}

.heatmap__today {
  fill: none;
  stroke: var(--map-last);
  stroke-width: 2;
}
</style>
