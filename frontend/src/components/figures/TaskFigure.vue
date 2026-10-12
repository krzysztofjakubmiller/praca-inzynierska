<script setup lang="ts">
import type { Figure, PlaneSpan, Range } from '@/figures'
import CoordinatePlane from './CoordinatePlane.vue'
import NumberLine from './NumberLine.vue'
import PlaneFigure from './PlaneFigure.vue'
import SolidFigure from './SolidFigure.vue'

// range i span to wspólna skala wszystkich osi i układów jednego zadania.
defineProps<{ figure: Figure; range?: Range; span?: PlaneSpan }>()
</script>

<template>
  <NumberLine v-if="figure.type === 'os-liczbowa'" :figure="figure" :range="range" />
  <CoordinatePlane
    v-else-if="figure.type === 'uklad-wspolrzednych'"
    :figure="figure"
    :span="span"
  />
  <PlaneFigure v-else-if="figure.type === 'figura'" :figure="figure" />
  <SolidFigure v-else-if="figure.type === 'bryla'" :figure="figure" />
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
