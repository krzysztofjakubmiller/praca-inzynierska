<script setup lang="ts">
import { ref } from 'vue'
import { BASIC_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import { stationPath } from '@/maps/shapes'
import type { Difficulty, MapProgress, TopicMap } from '@/maps/types'
import MetroMap from '@/components/map/MetroMap.vue'

// Prawdziwa mapa z aplikacji, z postępem przykładowego ucznia, w ramce telefonu.
const map: TopicMap = BASIC_MAP
const progress: MapProgress<string> = BASIC_DEMO_PROGRESS
const selected = ref<string>()

const SHAPES = ([0, 1, 2, 3] as Difficulty[]).map((difficulty) =>
  stationPath(difficulty, { x: 0, y: 0 }, 7),
)
const LEGEND = [
  'Kształt stacji to trudność tematu, od koła po pięciokąt.',
  'Kontur stacji zapełnia się, gdy robisz zadania.',
  'Pasażerowie przy stacji to zadania, które czekają na powtórkę.',
]
</script>

<template>
  <section class="shot" aria-labelledby="shot-title">
    <div class="shot__body">
      <h2 id="shot-title" class="shot__title">Tak wygląda mapa w aplikacji</h2>
      <p class="shot__text">To nie makieta. Przesuń mapę i dotknij dowolnej stacji.</p>
      <div class="shot__shapes" aria-hidden="true">
        <svg v-for="shape in SHAPES" :key="shape" viewBox="-11 -11 22 22">
          <path :d="shape" />
        </svg>
      </div>
      <ul class="shot__legend">
        <li v-for="item in LEGEND" :key="item">{{ item }}</li>
      </ul>
    </div>

    <div class="shot__phone">
      <p class="shot__bar">Matura podstawowa</p>
      <div class="shot__screen">
        <MetroMap
          :map="map"
          :progress="progress"
          orientation="portrait"
          :selected="selected"
          @select="selected = $event"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.shot {
  display: grid;
  gap: clamp(1.5rem, 1rem + 3vw, 4rem);
  align-content: center;
  align-items: center;
  padding: clamp(2.5rem, 2rem + 3vw, 5rem) max(var(--gutter), calc((100vw - 66rem) / 2));
  background: #e6e9f2;
}

.shot__body {
  display: grid;
  gap: 1rem;
}

.shot__title {
  max-width: 16ch;
  font-size: clamp(2rem, 1.5rem + 2.4vw, 3.4rem);
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.028em;
  line-height: 1;
  text-wrap: balance;
}

.shot__text {
  max-width: 40ch;
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.shot__shapes {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.shot__shapes svg {
  width: 1.75rem;
  height: 1.75rem;
  fill: #fff;
  stroke: #16224f;
  stroke-width: 3;
  stroke-linejoin: round;
  overflow: visible;
}

.shot__legend {
  display: grid;
  gap: 0.5rem;
  max-width: 44ch;
  padding-left: 1.1em;
  color: var(--ink-soft);
}

/* Ramka telefonu: ciemny brzeg, zaokrąglone rogi i ekran, w którym przewija się mapa. */
.shot__phone {
  display: flex;
  flex-direction: column;
  width: min(100%, 22rem);
  height: min(36rem, 78svh);
  margin-inline: auto;
  border: 0.55rem solid #101421;
  border-radius: 2.4rem;
  background: var(--ground);
  box-shadow:
    0 2px 3px rgb(16 20 33 / 0.2),
    0 34px 50px -28px rgb(16 20 33 / 0.55);
  overflow: hidden;
}

.shot__bar {
  flex: none;
  padding: 0.85rem 1.1rem 0.7rem;
  background: #168344;
  color: #fff;
  font-size: 1.15rem;
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: 0.01em;
  text-transform: uppercase;
}

.shot__screen {
  flex: 1;
  min-height: 0;
}

@media (min-width: 56rem) {
  .shot {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
  }
}
</style>
