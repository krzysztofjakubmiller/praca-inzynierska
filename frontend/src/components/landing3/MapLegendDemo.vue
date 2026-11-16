<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { DIFFICULTY_NAMES } from '@/maps/progress'
import { stationPath } from '@/maps/shapes'
import type { Difficulty } from '@/maps/types'
import FlapText from './FlapText.vue'

// Legenda mapy pokazana ruchem: kształt stacji zmienia się razem z nazwą trudności,
// kontur stacji się zapełnia, a pasażerowie dochodzą po jednym.
const STEP_MS = 700
// Kształt zmienia się co tyle kroków, żeby dało się przeczytać podpis.
const SHAPE_STEPS = 3
const MAX_PASSENGERS = 4

const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const step = ref(0)
let timer = 0

const SHAPES = ([0, 1, 2, 3] as Difficulty[]).map((difficulty) =>
  stationPath(difficulty, { x: 0, y: 0 }, 8),
)
const difficulty = computed(() => (Math.floor(step.value / SHAPE_STEPS) % 4) as Difficulty)
const passengers = computed(() =>
  still ? MAX_PASSENGERS : step.value % (MAX_PASSENGERS + 1),
)

onMounted(() => {
  if (!still) timer = window.setInterval(() => step.value++, STEP_MS)
})
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <ul class="legend">
    <li class="legend__item">
      <p>Kształt stacji to trudność tematu.</p>
      <div class="legend__demo legend__demo--shape" aria-hidden="true">
        <svg class="legend__station" viewBox="-12 -12 24 24">
          <path :d="SHAPES[difficulty]" />
        </svg>
        <FlapText class="legend__flaps" :text="DIFFICULTY_NAMES[difficulty]" :cells="13" settled />
      </div>
    </li>
    <li class="legend__item">
      <p>Kontur stacji zapełnia się, gdy robisz zadania.</p>
      <div class="legend__demo" aria-hidden="true">
        <svg class="legend__station legend__station--empty" viewBox="-12 -12 24 24">
          <path :d="SHAPES[3]" />
          <path class="legend__progress" :d="SHAPES[3]" pathLength="1" />
        </svg>
      </div>
    </li>
    <li class="legend__item">
      <p>Pasażerowie przy stacji to zadania, które czekają na powtórkę.</p>
      <div class="legend__demo" aria-hidden="true">
        <svg class="legend__station" viewBox="-12 -12 24 24">
          <path :d="SHAPES[0]" />
        </svg>
        <svg
          v-for="index in MAX_PASSENGERS"
          :key="index"
          class="legend__passenger"
          :class="{ 'is-here': index <= passengers }"
          viewBox="0 0 10 16"
        >
          <circle cx="5" cy="3.2" r="3" />
          <rect x="0.8" y="7.2" width="8.4" height="8.8" rx="3.4" />
        </svg>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.legend {
  display: grid;
  max-width: 34rem;
  padding: 0;
  border-bottom: 1px solid var(--hairline);
  list-style: none;
}

.legend__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  min-height: 4.5rem;
  padding-block: 0.75rem;
  border-top: 1px solid var(--hairline);
}

.legend__demo {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 8.5rem;
}

.legend__demo--shape {
  --cell: 0.64rem;
  --flap: rgb(255 255 255 / 0.14);
  display: grid;
  gap: 0.35rem;
  justify-items: start;
}

.legend__station {
  flex: none;
  width: 2.1rem;
  height: 2.1rem;
  margin-right: 0.3rem;
  fill: var(--ground);
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linejoin: round;
  overflow: visible;
}

.legend__station--empty > path:first-child {
  stroke-opacity: 0.35;
}

/* Kontur zapełnia się równym tempem, stoi chwilę pełny, zeruje się i po przerwie rusza znowu. */
.legend__progress {
  fill: none;
  stroke-dasharray: 1;
  stroke-linecap: round;
  animation: legend-fill 6s linear infinite;
}

.legend__passenger {
  width: 0.7rem;
  height: 1.12rem;
  fill: currentColor;
  opacity: 0;
  translate: 0 0.3rem;
  transition:
    opacity 0.25s ease,
    translate 0.25s ease;
}

.legend__passenger.is-here {
  opacity: 1;
  translate: 0 0;
}

@keyframes legend-fill {
  0% {
    stroke-dashoffset: 1;
  }

  55% {
    stroke-dashoffset: 0;
  }

  75% {
    stroke-dashoffset: 0;
    opacity: 1;
  }

  /* Wyzerowany kontur jest ukryty, bo zaokrąglony koniec kreski zostawiałby kropkę. */
  76% {
    stroke-dashoffset: 0;
    opacity: 0;
  }

  77%,
  99% {
    stroke-dashoffset: 1;
    opacity: 0;
  }

  100% {
    stroke-dashoffset: 1;
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .legend__progress {
    stroke-dashoffset: 0.3;
    animation: none;
  }

  .legend__passenger {
    transition: none;
  }
}
</style>
