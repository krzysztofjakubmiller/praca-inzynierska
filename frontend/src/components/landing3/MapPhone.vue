<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EXAMS } from '@/config/exams'
import { BASIC_MAP, EXTENDED_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import { EXTENDED_DEMO_PROGRESS } from '@/maps/extended/demoProgress'
import { DIFFICULTY_NAMES, progressShare } from '@/maps/progress'
import type { MapProgress, TopicMap } from '@/maps/types'
import MetroMap from '@/components/map/MetroMap.vue'
import KeyRow from './KeyRow.vue'

// Mapa tematów z aplikacji w ramce telefonu. Przyciski nad telefonem przełączają mapy,
// a telefon jest albo oknem, w którym mapa się przewija, albo ma wysokość całej mapy.
export type MapExam = 'matura-podstawowa' | 'matura-rozszerzona'

const MAPS: Record<MapExam, { map: TopicMap; progress: MapProgress<string> }> = {
  'matura-podstawowa': { map: BASIC_MAP, progress: BASIC_DEMO_PROGRESS },
  'matura-rozszerzona': { map: EXTENDED_MAP, progress: EXTENDED_DEMO_PROGRESS },
}
const KEYS = (Object.keys(MAPS) as MapExam[]).map((id) => ({
  id,
  lines: EXAMS.find((exam) => exam.id === id)!.name.split(' '),
  color: `var(--exam-${id})`,
}))
const SIZES = [
  { whole: false, name: 'Mapa przewijana' },
  { whole: true, name: 'Cała mapa naraz' },
]

const exam = defineModel<MapExam>('exam', { required: true })
const whole = ref(false)
const selected = ref<string>()

const shown = computed(() => MAPS[exam.value])
const name = computed(() => EXAMS.find((item) => item.id === exam.value)!.name)
const station = computed(() => {
  if (!selected.value) return undefined
  const { name, difficulty } = shown.value.map.graph.stations[selected.value]!
  const share = progressShare(shown.value.progress.topics[selected.value])
  return { name, facts: `temat ${DIFFICULTY_NAMES[difficulty]}, zrobione ${Math.round(share * 100)}%` }
})

watch(exam, () => (selected.value = undefined))
</script>

<template>
  <div class="mp" :class="{ 'mp--whole': whole }">
    <div class="mp__panel">
      <KeyRow
        :model-value="exam"
        :keys="KEYS"
        label="Mapa tematów"
        @update:model-value="exam = $event ?? exam"
      />
    </div>

    <div class="mp__phone" :style="{ '--exam': `var(--exam-${exam})` }">
      <p class="mp__bar">{{ name }}</p>
      <p class="mp__station" aria-live="polite">
        <template v-if="station">
          <strong>{{ station.name }}</strong>
          {{ station.facts }}
        </template>
        <template v-else>Dotknij stacji, żeby zobaczyć temat.</template>
      </p>
      <div class="mp__screen">
        <MetroMap
          :key="`${exam}-${whole}`"
          :map="shown.map"
          :progress="shown.progress"
          orientation="portrait"
          :selected="selected"
          @select="selected = $event"
        />
      </div>
    </div>

    <div class="mp__sizes" role="group" aria-label="Rozmiar telefonu">
      <button
        v-for="size in SIZES"
        :key="size.name"
        class="mp__size"
        type="button"
        :aria-pressed="whole === size.whole"
        @click="whole = size.whole"
      >
        {{ size.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.mp {
  /* Tyle zajmuje panel z przyciskami razem z odstępem nad telefonem. */
  --panel-h: 8.4rem;
  display: grid;
  justify-items: center;
  justify-self: center;
  /* Mapa potrzebuje około 360 px szerokości, więc na wąskim ekranie telefon wychodzi
     prawie do brzegów okna. */
  width: min(100% + 2 * (var(--gutter) - 0.5rem), 24.5rem);
  scroll-margin-top: var(--fit-top, 0.75rem);
}

.mp__sizes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem 1.1rem;
  margin-top: 0.75rem;
}

.mp__size {
  min-height: 2.75rem;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.25em;
  opacity: 0.8;
  cursor: pointer;
}

.mp__size[aria-pressed='true'] {
  font-weight: 800;
  text-decoration-thickness: 3px;
  opacity: 1;
}

/* Panel z przyciskami jak obudowa kasownika, osobno nad telefonem. */
.mp__panel {
  --body: var(--tp-body, #14161d);
  justify-self: stretch;
  margin-bottom: 0.9rem;
  padding: 0.9rem 1rem 0.6rem;
  border-radius: 1.4rem;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--body) 90%, #fff),
    var(--body) 30%,
    color-mix(in srgb, var(--body) 88%, #000)
  );
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.2),
    inset 0 -2px 0 rgb(0 0 0 / 0.25),
    0 18px 26px -18px rgb(0 0 0 / 0.55);
}

/* Ekran telefonu ma jasne kolory aplikacji, także gdy sekcja strony jest ciemna. */
.mp__phone {
  --ground: #f2f3f0;
  --surface: #fff;
  --ink: #1d1f22;
  --ink-soft: #55595f;
  --hairline: rgb(29 31 34 / 0.12);
  display: flex;
  flex-direction: column;
  justify-self: stretch;
  /* Przyciski i cały telefon mieszczą się w oknie pod nagłówkiem strony. */
  height: clamp(
    20rem,
    100svh - var(--fit-top, 0.75rem) - var(--panel-h) - 0.75rem,
    36rem
  );
  border: 0.5rem solid #101421;
  border-radius: 2.4rem;
  background: var(--ground);
  color: var(--ink);
  box-shadow:
    0 2px 3px rgb(0 0 0 / 0.25),
    0 34px 50px -28px rgb(0 0 0 / 0.6);
  overflow: hidden;
}

.mp__bar {
  flex: none;
  padding: 0.85rem 1.1rem 0.7rem;
  background: color-mix(in srgb, var(--exam) 82%, #000);
  color: #fff;
  font-size: 1.15rem;
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  transition: background-color 0.25s ease;
}

.mp__station {
  flex: none;
  min-height: 2.6rem;
  padding: 0.55rem 1.1rem;
  border-bottom: 1px solid var(--hairline);
  background: var(--surface);
  color: var(--ink-soft);
  font-size: 0.875rem;
  line-height: 1.35;
}

.mp__station strong {
  display: block;
  color: var(--ink);
  font-weight: 750;
}

.mp__screen {
  /* Wąski margines papieru pod mapą, żeby nazwy stacji mieściły się na ekranie. */
  --gutter: 0.25rem;
  flex: 1;
  min-height: 0;
}

.mp--whole .mp__phone {
  height: auto;
}

.mp--whole .mp__screen {
  flex: none;
}
</style>
