<script setup lang="ts">
import type { SolidKind } from '@/config/exams'

/** Stacja egzaminu to płaski kształt jej bryły; do tego bilet i znak zapytania. */
defineProps<{ shape: SolidKind | 'ticket' | 'question' }>()
</script>

<template>
  <svg class="marker" viewBox="0 0 24 24" aria-hidden="true">
    <circle v-if="shape === 'sphere'" cx="12" cy="12" r="8.5" />
    <polygon v-else-if="shape === 'tetrahedron'" points="12,3.4 20.6,18.2 3.4,18.2" />
    <rect v-else-if="shape === 'cube'" x="4.5" y="4.5" width="15" height="15" />
    <path
      v-else-if="shape === 'ticket'"
      d="M2.5 6.5H21.5V9.6A2.4 2.4 0 0 0 21.5 14.4V17.5H2.5V14.4A2.4 2.4 0 0 0 2.5 9.6Z"
    />
    <path
      v-else
      d="M7.6 8.4A4.4 4.4 0 1 1 14.2 12.2C12.9 12.9 12 13.8 12 15.3V15.8M12 20.2V20.3"
      fill="none"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.marker {
  width: 1em;
  height: 1em;
  overflow: visible;
  fill: var(--marker-fill, var(--surface));
  stroke: var(--marker-stroke, var(--ink));
  stroke-width: 3;
  stroke-linejoin: round;
  transition: fill 0.25s ease;
}
</style>
