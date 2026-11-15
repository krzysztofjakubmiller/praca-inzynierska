<script setup lang="ts">
import { computed, ref } from 'vue'
import { daysToExam } from '@/landing2/content'
import { BASIC_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import { DIFFICULTY_NAMES } from '@/maps/progress'
import type { MapProgress, TopicMap } from '@/maps/types'
import { TASK_FORMS, plural } from '@/utils/plural'
import FlapText from '@/components/landing3/FlapText.vue'
import MetroMap from '@/components/map/MetroMap.vue'
import type { Look } from '../AppScreen.vue'

// Mapa matury podstawowej z postępem przykładowego ucznia, w kolorach wybranego stylu.
defineProps<{ look: Look }>()

const map: TopicMap = BASIC_MAP
const progress: MapProgress<string> = BASIC_DEMO_PROGRESS

const selected = ref<string | undefined>(progress.lastStation)
const station = computed(() => (selected.value ? map.graph.stations[selected.value] : undefined))
const topic = computed(() => (selected.value ? progress.topics[selected.value] : undefined))

const days = daysToExam('matura-podstawowa', new Date())
const daysText = `${days} ${plural(days, ['dzień', 'dni', 'dni'])}`
const due = Object.values(progress.topics).reduce((sum, item) => sum + (item?.due ?? 0), 0)
</script>

<template>
  <div class="map">
    <div class="map__bar">
      <h1 class="as-title map__sign">Matura podstawowa</h1>
      <div class="map__counter">
        <span class="as-label">Do matury</span>
        <FlapText
          v-if="look === 'b'"
          class="as-flaps as-flaps--amber map__flaps"
          :text="daysText"
          :cells="7"
          settled
        />
        <strong v-else class="as-count">{{ daysText }}</strong>
      </div>
      <button class="button as-cta map__reviews" type="button">Powtórki na dziś: {{ due }}</button>
    </div>

    <main class="map__area">
      <MetroMap :map="map" :progress="progress" :selected="selected" @select="selected = $event" />
    </main>

    <section v-if="station" class="map__panel" aria-live="polite">
      <div class="map__panel-head">
        <h2 class="as-title map__station">{{ station.name }}</h2>
        <p class="as-label">temat {{ DIFFICULTY_NAMES[station.difficulty] }}</p>
      </div>
      <p class="map__text">{{ station.description }}</p>
      <dl v-if="topic" class="map__facts">
        <div>
          <dt class="as-label">Zrobione</dt>
          <dd>{{ topic.done }} z {{ topic.total }} {{ plural(topic.total, TASK_FORMS) }}</dd>
        </div>
        <div>
          <dt class="as-label">Do powtórki</dt>
          <dd>{{ topic.due }}</dd>
        </div>
      </dl>
      <div class="map__actions">
        <RouterLink class="button as-cta" :to="`/wizytowka3/${look}/zadanie`">Ćwicz</RouterLink>
        <button class="button button--quiet" type="button">Powtórki</button>
        <button class="button button--quiet" type="button">Teoria</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Ekran mapy zajmuje resztę wysokości okna: mapa przewija się w swoim polu, jak w aplikacji. */
.map {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: calc(100svh - var(--header-h));
  min-height: 0;
}

.map__bar {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 1.5rem;
  padding: 0.75rem var(--gutter);
  border-bottom: 1px solid var(--hairline);
}

/* Nazwa egzaminu na tablicy w jego kolorze, jak na wizytówce. */
.map__sign {
  margin-right: auto;
  padding: 0.24em 0.5em 0.28em;
  border-radius: 0.2em;
  background: var(--sign-fill);
  color: #fff;
  font-size: clamp(1.3rem, 1.1rem + 1.2vw, 2rem);
}

.map__counter {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.map__flaps {
  --cell: 1.15rem;
  padding: 0.35rem;
  border-radius: 0.5rem;
  background: #24221e;
}

.map__reviews {
  min-height: 2.75rem;
  font-variant-numeric: tabular-nums;
}

.map__area {
  flex: 1;
  min-height: 0;
}

.map__panel {
  display: grid;
  flex: none;
  gap: 0.7rem;
  max-height: 46svh;
  padding: 1rem var(--gutter) 1.25rem;
  border-top: 1px solid var(--hairline);
  background: var(--surface);
  overflow-y: auto;
}

.map__panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 1rem;
}

.map__station {
  font-size: clamp(1.5rem, 1.25rem + 1.2vw, 2.1rem);
}

.map__text {
  max-width: 62ch;
  color: var(--ink-soft);
}

.map__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 2rem;
}

.map__facts dd {
  font-size: 1.15rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.map__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

@media (min-width: 64rem) {
  /* Na szerokim ekranie panel stacji stoi obok mapy, a nie pod nią. */
  .map {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-columns: minmax(0, 1fr) 24rem;
  }

  .map__bar {
    grid-column: 1 / -1;
  }

  .map__panel {
    align-content: start;
    max-height: none;
    border-top: 0;
    border-left: 1px solid var(--hairline);
  }
}
</style>
