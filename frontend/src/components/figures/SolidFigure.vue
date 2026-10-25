<script setup lang="ts">
import { computed } from 'vue'
import type { SolidFigure } from '@/figures'
import { solidToPlane } from '@/solid'
import PlaneFigure from './PlaneFigure.vue'

const props = defineProps<{ figure: SolidFigure }>()

const plane = computed(() => solidToPlane(props.figure))
</script>

<template>
  <PlaneFigure :figure="plane" />
</template>
