<script setup lang="ts">
import { defineAsyncComponent, type Component } from 'vue'
import type { PageId } from '@/landing2/survey'
import LandingView from '@/views/LandingView.vue'
import SurveyBubble from '@/components/landing2/SurveyBubble.vue'

// Jedna wizytówka z ankiety razem z dymkiem do oceny. Każdy wariant ładuje się osobno,
// żeby oceniający nie pobierał kodu pozostałych.
defineProps<{ page: PageId }>()

const VIEWS: Record<PageId, Component> = {
  a: defineAsyncComponent(() => import('./VariantA.vue')),
  b: defineAsyncComponent(() => import('./VariantB.vue')),
  c: defineAsyncComponent(() => import('./VariantC.vue')),
  d: defineAsyncComponent(() => import('./VariantD.vue')),
  e: defineAsyncComponent(() => import('./VariantE.vue')),
  f: defineAsyncComponent(() => import('./VariantF.vue')),
  g: defineAsyncComponent(() => import('./VariantG.vue')),
  h: defineAsyncComponent(() => import('./VariantH.vue')),
  i: defineAsyncComponent(() => import('./VariantI.vue')),
  j: LandingView,
}
</script>

<template>
  <component :is="VIEWS[page]" :key="page" />
  <SurveyBubble :key="page" :page="page" />
</template>
