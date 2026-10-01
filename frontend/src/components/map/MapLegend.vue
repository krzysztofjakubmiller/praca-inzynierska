<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, useId, useTemplateRef } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import StationIcon from '@/components/map/StationIcon.vue'
import { DIFFICULTY_NAMES } from '@/maps/progress'
import type { Difficulty, TopicMap } from '@/maps/types'

defineProps<{ map: TopicMap }>()

const emit = defineEmits<{ close: [] }>()

const DIFFICULTIES: Difficulty[] = [0, 1, 2, 3]

const titleId = useId()
const title = useTemplateRef<HTMLElement>('title')

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  nextTick(() => title.value?.focus())
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <section class="map-legend" :aria-labelledby="titleId">
    <header class="map-legend__head">
      <h2 :id="titleId" ref="title" class="map-legend__title" tabindex="-1">Legenda</h2>
      <button
        type="button"
        class="icon-button map-legend__close"
        aria-label="Zamknij legendę"
        @click="emit('close')"
      >
        <AppIcon name="close" />
      </button>
    </header>

    <p class="map-legend__hint">Wybierz stację, żeby zobaczyć temat i zacząć.</p>

    <div class="map-legend__group">
      <h3 class="map-legend__heading">Linie</h3>
      <ul class="map-legend__list">
        <li v-for="line in map.graph.lines" :key="line.id" class="map-legend__item">
          <span
            class="map-legend__line"
            :style="{ background: `var(--line-${line.color})` }"
            aria-hidden="true"
          />
          {{ line.name }}
        </li>
      </ul>
    </div>

    <div class="map-legend__group">
      <h3 class="map-legend__heading">Trudność tematu</h3>
      <ul class="map-legend__list map-legend__list--row">
        <li v-for="difficulty in DIFFICULTIES" :key="difficulty" class="map-legend__item">
          <StationIcon :difficulty="difficulty" class="map-legend__icon" />
          {{ DIFFICULTY_NAMES[difficulty] }}
        </li>
      </ul>
    </div>

    <div class="map-legend__group">
      <h3 class="map-legend__heading">Na stacjach</h3>
      <ul class="map-legend__list">
        <li class="map-legend__item">
          <StationIcon :difficulty="0" :share="0.4" class="map-legend__icon" />
          Obrys stacji domyka się w miarę, jak robisz zadania z tematu.
        </li>
        <li class="map-legend__item">
          <svg
            class="map-legend__icon map-legend__passengers"
            viewBox="0 0 23 16"
            aria-hidden="true"
          >
            <use href="#metro-passenger" width="10" height="16" />
            <use href="#metro-passenger" x="13" width="10" height="16" />
          </svg>
          Im więcej ludzików, tym większa część zrobionych zadań czeka na powtórkę (najwyżej 4).
        </li>
        <li class="map-legend__item">
          <svg class="map-legend__icon map-legend__last" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="map-legend__ring" cx="12" cy="12" r="10" />
            <circle class="map-legend__station" cx="12" cy="12" r="5" />
          </svg>
          Kółko i napis „Kontynuuj” oznaczają ostatnio robiony temat.
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.map-legend {
  display: grid;
  align-content: start;
  gap: 1.25rem;
  padding: var(--sheet-pad);
  background: var(--surface);
  color: var(--ink);
}

.map-legend__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.map-legend__title {
  font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.25rem);
  font-weight: 750;
  font-stretch: 90%;
  letter-spacing: -0.02em;
  line-height: 1;
}

.map-legend__title:focus {
  outline: none;
}

.map-legend__close {
  margin: -0.5rem -0.625rem 0 0;
}

.map-legend__hint {
  margin-top: -0.5rem;
  font-size: 0.9375rem;
  line-height: 1.35;
}

.map-legend__group {
  display: grid;
  gap: 0.5rem;
}

.map-legend__heading {
  color: var(--ink-soft);
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1.5;
}

.map-legend__list {
  display: grid;
  gap: 0.6rem;
  padding: 0;
  list-style: none;
}

.map-legend__list--row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.map-legend__item {
  display: grid;
  grid-template-columns: 1.75rem 1fr;
  align-items: center;
  column-gap: 0.6rem;
  font-size: 0.9375rem;
  line-height: 1.35;
}

.map-legend__line {
  height: 0.45rem;
  border-radius: 999px;
}

.map-legend__icon {
  justify-self: center;
  font-size: 1.25rem;
}

.map-legend__passengers {
  width: auto;
  height: 1.05rem;
  fill: var(--ink);
}

.map-legend__last {
  width: 1.5rem;
  height: 1.5rem;
  fill: none;
  stroke-width: 2.5;
}

.map-legend__ring {
  stroke: var(--map-last);
}

.map-legend__station {
  fill: var(--surface);
  stroke: var(--map-outline);
  stroke-width: 2.5;
}
</style>
