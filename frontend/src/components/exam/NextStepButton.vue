<script setup lang="ts">
import { computed } from 'vue'
import { nextStep, type DiagnosticSheets } from '@/maps/nextStep'
import type { MapProgress, TopicMap } from '@/maps/types'
import { plural } from '@/utils/plural'
import { shortCount } from '@/utils/shortCount'

const props = defineProps<{
  map: TopicMap
  progress?: MapProgress<string>
  sheets: DiagnosticSheets
}>()

const TASKS: [string, string, string] = ['zadanie', 'zadania', 'zadań']

const text = computed(() => {
  const step = nextStep(props.map, props.progress, props.sheets)
  if (step.kind === 'diagnostic') {
    const label = step.first ? 'Arkusz diagnostyczny' : 'Kolejny arkusz diagnostyczny'
    return { label, spoken: label }
  }
  if (step.kind === 'reviews') {
    return {
      label: `Powtórki · ${shortCount(step.count)}`,
      spoken: `Powtórki, ${step.count} ${plural(step.count, TASKS)}`,
    }
  }
  const station = props.map.graph.stations[step.stationId]!
  return {
    label: `Kontynuuj · ${station.shortName ?? station.name}`,
    spoken: `Kontynuuj temat ${station.name}`,
  }
})
</script>

<template>
  <RouterLink class="button next-step" :to="{ name: 'coming-soon' }" :aria-label="text.spoken">
    <span class="next-step__label">{{ text.label }}</span>
  </RouterLink>
</template>

<style scoped>
.next-step {
  max-width: 100%;
}

.next-step__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
