<script setup lang="ts">
import { computed } from 'vue'
import { currentStreak, longestStreak, plural, shiftDay } from '@/stats/stats'

const props = defineProps<{
  /** Zadania w kolejnych dniach, ostatni element to dziś. */
  days: readonly number[]
  /** Skuteczność ostatnich zadań, od 0 do 1. */
  recentScore: number
  today: string
  width: number
}>()

const WEEKDAYS = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb']
const SIDE = 12

// Tydzień jako odcinek trasy, tak samo jak seria: dzień nauki to stacja, dni z rzędu łączy linia.
const stops = computed(() => {
  const step = (props.width - 2 * SIDE) / 6
  return props.days.slice(-7).map((tasks, index) => {
    const day = shiftDay(props.today, index - 6)
    return {
      day,
      tasks,
      x: SIDE + index * step,
      label: index === 6 ? 'dziś' : WEEKDAYS[new Date(`${day}T12:00`).getDay()]!,
    }
  })
})
const rides = computed(() =>
  stops.value.slice(1).flatMap((stop, index) => {
    const before = stops.value[index]!
    return stop.tasks > 0 && before.tasks > 0 ? [{ from: before.x, to: stop.x }] : []
  }),
)

const activeDays = computed(() => stops.value.filter((stop) => stop.tasks > 0).length)
const tasks = computed(() => stops.value.reduce((sum, stop) => sum + stop.tasks, 0))
const change = computed(() => tasks.value - props.days.slice(-14, -7).reduce((a, b) => a + b, 0))
const streak = computed(() => currentStreak(props.days))
const longest = computed(() => longestStreak(props.days))

const changeText = computed(() => {
  if (change.value === 0) return 'tyle samo co tydzień wcześniej'
  const sign = change.value > 0 ? '+' : '−'
  return `${sign}${Math.abs(change.value)} niż tydzień wcześniej`
})
</script>

<template>
  <div class="week">
    <svg class="chart" :viewBox="`0 0 ${width} 52`" aria-hidden="true">
      <line class="chart__track" :x1="SIDE" :x2="width - SIDE" y1="16" y2="16" stroke-width="3" />
      <line
        v-for="ride in rides"
        :key="ride.from"
        class="week__ride"
        :x1="ride.from"
        :x2="ride.to"
        y1="16"
        y2="16"
      />
      <g v-for="(stop, index) in stops" :key="stop.day">
        <circle v-if="stop.tasks > 0" class="chart__station" :cx="stop.x" cy="16" r="6.5" />
        <circle v-else class="chart__empty-day" :cx="stop.x" cy="16" r="3" />
        <circle v-if="index === 6" class="chart__today" :cx="stop.x" cy="16" r="11" />
        <text
          :class="{ chart__strong: index === 6 }"
          :x="stop.x"
          y="48"
          :text-anchor="index === 0 ? 'start' : index === 6 ? 'end' : 'middle'"
        >
          {{ stop.label }}
        </text>
      </g>
    </svg>

    <dl class="week__figures">
      <div>
        <dt>Dni nauki</dt>
        <dd class="week__value">{{ activeDays }} z 7</dd>
      </div>
      <div>
        <dt>Zadania</dt>
        <dd class="week__value">{{ tasks }}</dd>
        <dd class="week__note">{{ changeText }}</dd>
      </div>
      <div>
        <dt>Skuteczność</dt>
        <dd class="week__value">{{ Math.round(recentScore * 100) }}%</dd>
        <dd class="week__note">w ostatnich zadaniach</dd>
      </div>
      <div>
        <dt>Seria</dt>
        <dd class="week__value">{{ streak }} {{ plural(streak, 'dzień', 'dni', 'dni') }}</dd>
        <dd class="week__note">najdłuższa: {{ longest }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.week {
  container-type: inline-size;
}

.week__ride {
  stroke: var(--line-3);
  stroke-width: 7;
  stroke-linecap: round;
}

/* Liczby jak w rozkładzie jazdy: kreska nad każdą, bez osobnych kafelków w karcie. */
.week__figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.25rem;
  margin-top: 1.25rem;
}

.week__figures > div {
  padding-top: 0.75rem;
  border-top: 1px solid var(--hairline);
}

.week dt {
  color: var(--ink-soft);
  font-size: 0.8125rem;
  font-weight: 650;
}

.week__value {
  margin: 0.125rem 0 0.2rem;
  font-size: 1.75rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  font-variation-settings: 'wdth' 90;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.week__note {
  color: var(--ink-soft);
  font-size: 0.8125rem;
  line-height: 1.35;
}

@container (min-width: 34rem) {
  .week__figures {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
