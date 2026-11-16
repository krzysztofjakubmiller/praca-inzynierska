<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { BASIC_MAP, EXTENDED_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import { EXTENDED_DEMO_PROGRESS } from '@/maps/extended/demoProgress'
import { DIFFICULTY_NAMES, progressShare } from '@/maps/progress'
import type { MapProgress, TopicMap } from '@/maps/types'
import MetroMap from '@/components/map/MetroMap.vue'
import PassengerSymbol from '@/components/map/PassengerSymbol.vue'
import KeyRow from './KeyRow.vue'

// Mapa tematów z aplikacji w ramce telefonu. Przyciski nad telefonem przełączają mapy,
// a telefon ma wysokość całej mapy, więc nic się w nim nie przewija.
// Egzamin ósmoklasisty nie ma jeszcze własnej mapy i pokazuje mapę matury podstawowej.
const MAPS: Record<Exam['id'], { map: TopicMap; progress: MapProgress<string> }> = {
  e8: { map: BASIC_MAP, progress: BASIC_DEMO_PROGRESS },
  'matura-podstawowa': { map: BASIC_MAP, progress: BASIC_DEMO_PROGRESS },
  'matura-rozszerzona': { map: EXTENDED_MAP, progress: EXTENDED_DEMO_PROGRESS },
}
const KEYS = EXAMS.map((item) => ({
  id: item.id,
  lines: item.id === 'e8' ? ['E8'] : item.name.split(' '),
  color: `var(--exam-${item.id})`,
}))

const exam = defineModel<Exam['id']>('exam', { required: true })
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
  <div class="mp">
    <svg class="mp__sprite" aria-hidden="true">
      <defs>
        <PassengerSymbol />
      </defs>
    </svg>

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
          :key="exam"
          :map="shown.map"
          :progress="shown.progress"
          orientation="portrait"
          :selected="selected"
          @select="selected = $event"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mp {
  display: grid;
  justify-self: center;
  /* Mapa potrzebuje około 360 px szerokości, więc na wąskim ekranie telefon wychodzi
     prawie do brzegów okna. */
  width: min(100% + 2 * (var(--gutter) - 0.5rem), 24.5rem);
}

.mp__sprite {
  position: absolute;
  width: 0;
  height: 0;
}

/* Panel z przyciskami jak obudowa kasownika, osobno nad telefonem. */
.mp__panel {
  --body: var(--tp-body, #14161d);
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

/* Ekran telefonu ma zawsze jasne kolory aplikacji, także gdy sekcja strony jest ciemna. */
.mp__phone {
  --ground: #f2f3f0;
  --surface: #fff;
  --ink: #1d1f22;
  --ink-soft: #55595f;
  --hairline: rgb(29 31 34 / 0.12);
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

/* Stała wysokość na dwa wiersze, żeby wybór stacji nie przesuwał mapy. */
.mp__station {
  display: grid;
  align-content: center;
  height: 3.6rem;
  padding-inline: 1.1rem;
  border-bottom: 1px solid var(--hairline);
  background: var(--surface);
  color: var(--ink-soft);
  font-size: 0.875rem;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
}

.mp__station strong {
  color: var(--ink);
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Wąski margines papieru pod mapą, żeby nazwy stacji mieściły się na ekranie. */
.mp__screen {
  --gutter: 0.25rem;
}
</style>
