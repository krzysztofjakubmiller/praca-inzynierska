<script setup lang="ts">
import { computed } from 'vue'
import { stationPath } from '@/maps/shapes'
import type { Difficulty } from '@/maps/types'

const props = defineProps<{
  difficulty: Difficulty
  /** Zrobiona część tematu, od 0 do 1. */
  share?: number
}>()

// Promień dobrany tak, żeby rogi trójkąta z konturem mieściły się w polu 24 × 24.
const path = computed(() => stationPath(props.difficulty, { x: 12, y: 12 }, 6.8))
</script>

<template>
  <svg class="station-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path class="station-icon__outline" :d="path" />
    <path
      v-if="share"
      class="station-icon__progress"
      :d="path"
      pathLength="1"
      :stroke-dasharray="`${share} 1`"
    />
  </svg>
</template>

<style scoped>
.station-icon {
  width: 1em;
  height: 1em;
  overflow: visible;
  stroke-width: 3;
  stroke-linejoin: round;
}

.station-icon__outline {
  fill: var(--surface);
  stroke: var(--map-outline);
}

.station-icon__progress {
  fill: none;
  stroke: var(--map-progress);
  stroke-linecap: round;
}
</style>
