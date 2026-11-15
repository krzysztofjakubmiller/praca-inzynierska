<script setup lang="ts">
import { computed } from 'vue'
import { miniMap } from '@/landing3/miniMap'
import { BASIC_MAP } from '@/maps'
import type { Orientation } from '@/maps/geometry'

// Rysunek mapy matury podstawowej. Wyróżniona linia rysuje się od pierwszej stacji, pozostałe
// zostają w tle. Kolory linii to zmienne --line-*, tło stacji to --mm-fill.
const props = withDefaults(
  defineProps<{
    orientation?: Orientation
    /** Linia na pierwszym planie; bez niej wszystkie linie są równe. */
    active?: string
    /** Stacje zamalowane kolorem linii, jak tematy już przerobione. */
    done?: ReadonlySet<string>
  }>(),
  { orientation: 'landscape' },
)

const map = computed(() => miniMap(BASIC_MAP, props.orientation))
const front = computed(() => map.value.lines.find((line) => line.id === props.active))

function inFront(id: string): boolean {
  return !front.value || front.value.stations.includes(id)
}
</script>

<template>
  <svg class="mm" :viewBox="map.viewBox" role="img" aria-label="Schemat mapy tematów">
    <path
      v-for="line in map.lines"
      :key="line.id"
      class="mm__line"
      :class="{ 'mm__line--back': front && line.id !== front.id }"
      :d="line.path"
      :style="{ '--color': `var(--line-${line.color})` }"
    />
    <!-- Klucz zmienia się razem z linią, więc rysowanie zaczyna się od nowa. -->
    <path
      v-if="front"
      :key="front.id"
      class="mm__line mm__line--front"
      :d="front.path"
      pathLength="1"
      :style="{ '--color': `var(--line-${front.color})` }"
    />
    <path
      v-for="station in map.stations"
      :key="station.id"
      class="mm__station"
      :class="{
        'mm__station--back': !inFront(station.id),
        'mm__station--done': done?.has(station.id),
      }"
      :d="station.shape"
      :style="{
        '--color': `var(--line-${front && inFront(station.id) ? front.color : station.color})`,
      }"
    />
    <slot :map="map" />
  </svg>
</template>

<style scoped>
.mm {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.mm__line {
  fill: none;
  stroke: var(--color);
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition:
    stroke 0.4s ease,
    stroke-width 0.4s ease,
    opacity 0.4s ease;
}

.mm__line--back {
  stroke: var(--mm-back, currentColor);
  stroke-width: 3;
  opacity: var(--mm-back-opacity, 0.28);
}

.mm__line--front {
  stroke-width: 9;
  stroke-dasharray: 1;
}

.mm__station {
  fill: var(--mm-fill, #fff);
  stroke: var(--color);
  stroke-width: 3.5;
  stroke-linejoin: round;
  transition:
    fill 0.5s ease,
    stroke 0.4s ease,
    opacity 0.4s ease;
}

.mm__station--back {
  stroke: var(--mm-back, currentColor);
  stroke-width: 2;
  opacity: var(--mm-back-opacity, 0.28);
}

.mm__station--done {
  fill: var(--color);
}

@media (prefers-reduced-motion: no-preference) {
  .mm__line--front {
    animation: mm-draw 1s cubic-bezier(0.3, 0, 0.2, 1) both;
  }
}

@keyframes mm-draw {
  from {
    stroke-dashoffset: 1;
  }

  to {
    stroke-dashoffset: 0;
  }
}
</style>
