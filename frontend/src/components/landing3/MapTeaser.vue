<script setup lang="ts">
import { computed, ref } from 'vue'
import { LINE_TEXT } from '@/landing3/content'
import { BASIC_MAP } from '@/maps'
import { stationPath } from '@/maps/shapes'
import { plural } from '@/utils/plural'
import MiniMap from './MiniMap.vue'

// Mapa matury podstawowej pokazywana po jednej linii: cała sieć zostaje w tle, a na pierwszym
// planie jest tylko kilka stacji wybranej linii, żeby mapa nie przytłaczała liczbą tematów.
const lines = BASIC_MAP.graph.lines
const stations = BASIC_MAP.graph.stations
const active = ref(lines[0]!.id)

const line = computed(() => lines.find((item) => item.id === active.value)!)
const stops = computed(() =>
  line.value.stations.map((id) => ({
    id,
    name: stations[id].shortName ?? stations[id].name,
    shape: stationPath(stations[id].difficulty, { x: 0, y: 0 }, 7),
  })),
)

function count(total: number): string {
  return `${total} ${plural(total, ['stacja', 'stacje', 'stacji'])}`
}
</script>

<template>
  <div class="teaser" :style="{ '--line': `var(--line-${line.color})` }">
    <div class="teaser__picker" role="group" aria-label="Linia mapy">
      <button
        v-for="item in lines"
        :key="item.id"
        class="teaser__pick"
        type="button"
        :aria-pressed="item.id === active"
        :style="{ '--dot': `var(--line-${item.color})` }"
        @click="active = item.id"
      >
        <span class="teaser__dot" aria-hidden="true" />
        {{ item.name }}
      </button>
    </div>

    <MiniMap class="teaser__map" :active="active" />

    <div class="teaser__line" aria-live="polite">
      <h3 class="teaser__name">
        Linia {{ line.name.toLowerCase() }}
        <span class="teaser__count">{{ count(line.stations.length) }}</span>
      </h3>
      <p class="teaser__text">{{ LINE_TEXT[line.id] }}</p>
      <ol class="teaser__stops">
        <li v-for="stop in stops" :key="stop.id" class="teaser__stop">
          <svg class="teaser__shape" viewBox="-11 -11 22 22" aria-hidden="true">
            <path :d="stop.shape" />
          </svg>
          {{ stop.name }}
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.teaser {
  display: grid;
  gap: clamp(1.1rem, 0.9rem + 1vw, 1.75rem);
  min-width: 0;
}

.teaser__picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.teaser__pick {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0 1rem 0 0.8rem;
  border: 1.5px solid var(--teaser-edge, var(--hairline));
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.teaser__pick[aria-pressed='true'] {
  border-color: var(--teaser-on, var(--ink));
  background: var(--teaser-on, var(--ink));
  color: var(--teaser-on-ink, var(--ground));
}

.teaser__dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--dot);
}

.teaser__line {
  display: grid;
  gap: 0.5rem;
}

.teaser__name {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.8rem;
  font-size: clamp(1.4rem, 1.2rem + 1vw, 2rem);
  font-weight: var(--display-weight, 800);
  font-stretch: var(--display-stretch, 88%);
  letter-spacing: -0.015em;
  line-height: 1.1;
}

.teaser__count {
  color: var(--ink-soft);
  font-size: 0.9375rem;
  font-stretch: 100%;
  font-weight: 650;
  letter-spacing: 0;
}

.teaser__text {
  max-width: 52ch;
  color: var(--ink-soft);
}

.teaser__stops {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
  padding: 0;
  list-style: none;
}

.teaser__stop {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.1rem;
  padding: 0 0.8rem 0 0.5rem;
  border-radius: 999px;
  background: var(--teaser-stop, color-mix(in srgb, currentColor 9%, transparent));
  font-size: 0.9375rem;
  font-weight: 600;
}

.teaser__shape {
  flex: none;
  width: 1.15rem;
  height: 1.15rem;
  fill: var(--mm-fill, #fff);
  stroke: var(--line);
  stroke-width: 3.2;
  stroke-linejoin: round;
  overflow: visible;
}
</style>
