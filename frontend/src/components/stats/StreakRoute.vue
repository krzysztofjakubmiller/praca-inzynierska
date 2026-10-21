<script setup lang="ts">
import { computed } from 'vue'
import { currentStreak, longestStreak, plural, shiftDay, shortDate } from '@/stats/stats'

const props = defineProps<{
  /** Zadania w kolejnych dniach, ostatni element to dziś. */
  days: readonly number[]
  today: string
  width: number
}>()

const ROW = 40
const SIDE = 14

// Ostatnie cztery tygodnie wężykiem: pierwszy wiersz od lewej, drugi wraca od prawej i tak dalej,
// więc kolejne dni zawsze stoją obok siebie jak stacje na linii.
const stops = computed(() => {
  const last = props.days.slice(-28)
  const step = (props.width - 2 * SIDE) / 6
  return last.map((tasks, index) => {
    const row = Math.floor(index / 7)
    const place = index % 7
    const column = row % 2 === 0 ? place : 6 - place
    return {
      tasks,
      day: shiftDay(props.today, index - 27),
      x: SIDE + column * step,
      y: 16 + row * ROW,
    }
  })
})

const links = computed(() =>
  stops.value.slice(1).map((stop, index) => ({
    from: stops.value[index]!,
    to: stop,
    riding: stop.tasks > 0 && stops.value[index]!.tasks > 0,
  })),
)

const streak = computed(() => currentStreak(props.days))
const longest = computed(() => longestStreak(props.days))
const activeDays = computed(() => stops.value.filter((stop) => stop.tasks > 0).length)
const summary = computed(
  () =>
    `Ostatnie 4 tygodnie: ${activeDays.value} z 28 dni nauki. Seria ${streak.value} ` +
    `${plural(streak.value, 'dzień', 'dni', 'dni')}, najdłuższa ${longest.value}.`,
)
</script>

<template>
  <svg
    class="chart"
    :viewBox="`0 0 ${width} ${16 + 3 * ROW + 16}`"
    role="img"
    :aria-label="summary"
  >
    <line
      v-for="link in links"
      :key="link.to.day"
      :class="link.riding ? 'streak__ride' : 'streak__gap'"
      :x1="link.from.x"
      :y1="link.from.y"
      :x2="link.to.x"
      :y2="link.to.y"
    />
    <g v-for="(stop, index) in stops" :key="stop.day">
      <circle v-if="stop.tasks > 0" class="chart__station" :cx="stop.x" :cy="stop.y" r="6" />
      <circle v-else class="chart__empty-day" :cx="stop.x" :cy="stop.y" r="3" />
      <circle v-if="index === 27" class="chart__today" :cx="stop.x" :cy="stop.y" r="10.5" />
      <title>
        {{ shortDate(stop.day) }}: {{ stop.tasks }}
        {{ plural(stop.tasks, 'zadanie', 'zadania', 'zadań') }}
      </title>
    </g>
  </svg>
</template>

<style scoped>
.streak__ride {
  stroke: var(--line-3);
  stroke-width: 7;
  stroke-linecap: round;
}

.streak__gap {
  stroke: var(--track);
  stroke-width: 2;
  stroke-dasharray: 2 5;
  stroke-linecap: round;
}
</style>
