<script setup lang="ts">
import type { Who } from '@/landing2/content'

/** Znak wykonawcy: człowiek, program albo Dyżurny (tarcza sygnałowa dyżurnego ruchu). */
defineProps<{ who: Who }>()
</script>

<template>
  <svg class="who" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="who === 'human'">
      <circle cx="12" cy="7.6" r="3.9" />
      <path d="M4.2 20.6c.7-4.4 3.8-6.8 7.8-6.8s7.1 2.4 7.8 6.8" />
    </template>
    <template v-else-if="who === 'program'">
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3.4" />
      <path d="M8 12.4l2.7 2.7L16.2 9" />
    </template>
    <template v-else>
      <circle cx="12" cy="8.8" r="6.2" />
      <circle cx="12" cy="8.8" r="1.6" class="who__fill" />
      <path d="M12 15v6.4" />
    </template>
  </svg>
</template>

<style scoped>
.who {
  flex: none;
  width: 1em;
  height: 1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.who__fill {
  fill: currentColor;
  stroke: none;
}
</style>
