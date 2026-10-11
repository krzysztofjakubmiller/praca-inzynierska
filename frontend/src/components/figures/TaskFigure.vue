<script setup lang="ts">
import type { Figure, Range } from '@/figures'
import NumberLine from './NumberLine.vue'

defineProps<{ figure: Figure; range?: Range }>()
</script>

<template>
  <NumberLine v-if="figure.type === 'os-liczbowa'" :figure="figure" :range="range" />
  <p v-else class="task-figure__missing">Rysunek (jeszcze niedostępny)</p>
</template>

<style scoped>
.task-figure__missing {
  padding: 1.5rem;
  border: 2px dashed var(--hairline);
  border-radius: 0.75rem;
  color: var(--ink-soft);
  text-align: center;
}
</style>
