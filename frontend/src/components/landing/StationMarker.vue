<script setup lang="ts">
import type { SolidKind } from '@/config/exams'

defineProps<{ solid: SolidKind; soon?: boolean }>()
</script>

<template>
  <svg class="marker" :class="{ 'marker--soon': soon }" viewBox="0 0 24 24" aria-hidden="true">
    <circle v-if="solid === 'sphere'" cx="12" cy="12" r="8.5" />
    <polygon v-else-if="solid === 'tetrahedron'" points="12,3.4 20.6,18.2 3.4,18.2" />
    <rect v-else x="4.5" y="4.5" width="15" height="15" />
  </svg>
</template>

<style scoped>
.marker {
  width: 1em;
  height: 1em;
  overflow: visible;
  fill: var(--marker-fill, var(--surface));
  stroke: var(--ink);
  stroke-width: 3;
  stroke-linejoin: round;
  transition: fill 0.25s ease;
}

/* A station that is not open yet is drawn like one under construction. */
.marker--soon {
  stroke-dasharray: 3.4 2.6;
}
</style>
