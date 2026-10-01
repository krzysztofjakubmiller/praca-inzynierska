<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import StationIcon from '@/components/map/StationIcon.vue'
import { lineStops } from '@/maps/order'
import {
  DIFFICULTY_NAMES,
  TOPIC_STATE_NAMES,
  effectiveness,
  passengerCount,
  progressShare,
  topicState,
} from '@/maps/progress'
import type { MapProgress, TopicMap } from '@/maps/types'
import { plural } from '@/utils/plural'
import { shortCount } from '@/utils/shortCount'

const props = defineProps<{
  map: TopicMap
  progress?: MapProgress<string>
  stationId: string
}>()

const emit = defineEmits<{
  close: []
  select: [id: string]
}>()

const TASKS: [string, string, string] = ['zadanie', 'zadania', 'zadań']

const station = computed(() => props.map.graph.stations[props.stationId]!)
const topic = computed(() => props.progress?.topics[props.stationId])
const share = computed(() => progressShare(topic.value))
const score = computed(() => effectiveness(topic.value))
const due = computed(() => topic.value?.due ?? 0)
const passengers = computed(() => passengerCount(topic.value))
const stops = computed(() => lineStops(props.map, props.stationId))
const isLast = computed(() => props.progress?.lastStation === props.stationId)

const percent = (value: number) => `${Math.round(value * 100)}%`
// Po „z” rzeczownik stoi w dopełniaczu: z 1 zadania, z 2 zadań, z 32 zadań.
const ofTasks = (count: number) => (count === 1 ? 'zadania' : 'zadań')
const attempts = computed(() => topic.value?.recent.attempts ?? 0)
const nameOf = (id: string) => props.map.graph.stations[id]?.name ?? id

// „dzisiaj”, „wczoraj”, „3 dni temu” liczone w dniach kalendarzowych, a nie w godzinach.
const relative = new Intl.RelativeTimeFormat('pl', { numeric: 'auto' })
const lastSeen = computed(() => {
  const date = topic.value?.lastActivity
  if (!date) return undefined
  const day = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const days = Math.round((day(new Date()).getTime() - day(date).getTime()) / 86_400_000)
  return relative.format(-days, 'day')
})

const titleId = useId()
const root = useTemplateRef<HTMLElement>('root')
const title = useTemplateRef<HTMLElement>('title')

// Po otwarciu albo przejściu do sąsiedniej stacji panel zaczyna od góry, a czytnik ekranu
// od razu słyszy nazwę. Przewija się sam panel (telefon) albo kolumna, w której stoi.
watch(
  () => props.stationId,
  () =>
    nextTick(() => {
      for (const element of [root.value, root.value?.parentElement]) {
        if (element) element.scrollTop = 0
      }
      title.value?.focus({ preventScroll: true })
    }),
  { immediate: true },
)

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <section ref="root" class="station-panel" :aria-labelledby="titleId">
    <header class="station-panel__head">
      <h2 :id="titleId" ref="title" class="station-panel__title" tabindex="-1">
        {{ station.name }}
      </h2>
      <button
        type="button"
        class="icon-button station-panel__close"
        aria-label="Zamknij"
        @click="emit('close')"
      >
        <AppIcon name="close" />
      </button>
    </header>

    <p class="station-panel__meta">
      <StationIcon :difficulty="station.difficulty" :share="share" />
      {{ DIFFICULTY_NAMES[station.difficulty] }} · {{ TOPIC_STATE_NAMES[topicState(topic)] }}
    </p>

    <p class="station-panel__description">{{ station.description }}</p>

    <dl class="station-panel__stats">
      <div>
        <dt>Zrobione</dt>
        <dd>
          <strong>{{ percent(share) }}</strong>
          <span v-if="topic?.done">
            {{ topic.done }} z {{ topic.total }} {{ ofTasks(topic.total) }}
          </span>
          <span v-else>jeszcze bez zadań</span>
        </dd>
      </div>
      <div>
        <dt>Skuteczność</dt>
        <dd v-if="score !== undefined">
          <strong>{{ percent(score) }}</strong>
          <span v-if="attempts === 1">dobrze z 1 {{ ofTasks(1) }}</span>
          <span v-else>dobrze z ostatnich {{ attempts }}</span>
        </dd>
        <dd v-else>
          <strong>–</strong>
          <span>pojawi się po pierwszym zadaniu</span>
        </dd>
      </div>
      <div>
        <dt>Do powtórki</dt>
        <dd>
          <strong>{{ due }}</strong>
          <span class="station-panel__waiting">
            {{ plural(due, TASKS) }}
            <svg
              v-if="passengers"
              class="station-panel__passengers"
              :viewBox="`0 0 ${passengers * 13 - 3} 16`"
              aria-hidden="true"
            >
              <use
                v-for="index in passengers"
                :key="index"
                href="#metro-passenger"
                :x="(index - 1) * 13"
                width="10"
                height="16"
              />
            </svg>
          </span>
        </dd>
      </div>
    </dl>

    <ul class="station-panel__lines">
      <li v-for="stop in stops" :key="stop.line.id" class="station-panel__line">
        <span
          class="station-panel__swatch"
          :style="{ background: `var(--line-${stop.line.color})` }"
          aria-hidden="true"
        />
        <span class="station-panel__line-name">Linia {{ stop.line.name }}</span>
        <span class="station-panel__neighbours">
          <button
            v-if="stop.previous"
            type="button"
            class="station-panel__neighbour"
            @click="emit('select', stop.previous)"
          >
            ← {{ nameOf(stop.previous) }}
          </button>
          <button
            v-if="stop.next"
            type="button"
            class="station-panel__neighbour"
            @click="emit('select', stop.next)"
          >
            {{ nameOf(stop.next) }} →
          </button>
        </span>
      </li>
    </ul>

    <p v-if="lastSeen" class="station-panel__seen">Ostatnio: {{ lastSeen }}</p>

    <div class="station-panel__actions">
      <RouterLink class="button station-panel__main" :to="{ name: 'coming-soon' }">
        {{ isLast ? 'Kontynuuj' : 'Ćwicz' }}
      </RouterLink>
      <RouterLink v-if="due" class="button button--quiet" :to="{ name: 'coming-soon' }">
        Powtórki · {{ shortCount(due) }}
      </RouterLink>
      <RouterLink
        class="button button--quiet"
        :class="{ 'station-panel__main': !due }"
        :to="{ name: 'coming-soon' }"
      >
        Teoria
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.station-panel {
  display: grid;
  align-content: start;
  gap: 1rem;
  /* Bez dolnego marginesu: dół zajmuje przyklejony pasek przycisków. */
  padding: var(--sheet-pad) var(--sheet-pad) 0;
  background: var(--surface);
  color: var(--ink);
}

.station-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.station-panel__title {
  font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.25rem);
  font-weight: 750;
  font-stretch: 90%;
  letter-spacing: -0.02em;
  line-height: 1;
}

.station-panel__title:focus {
  outline: none;
}

.station-panel__close {
  margin: -0.5rem -0.625rem 0 0;
}

.station-panel__meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: -0.5rem;
  color: var(--ink-soft);
  font-size: 0.9375rem;
  font-weight: 550;
}

.station-panel__description {
  max-width: 44ch;
}

.station-panel__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding-block: 1rem;
  border-block: 1px solid var(--hairline);
}

.station-panel__stats dt {
  color: var(--ink-soft);
  font-size: 0.8125rem;
}

.station-panel__stats dd {
  display: grid;
  gap: 0.15rem;
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.3;
}

.station-panel__stats strong {
  font-size: 1.5rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.station-panel__waiting {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.station-panel__passengers {
  height: 1.05em;
  width: auto;
  fill: var(--ink);
}

.station-panel__lines {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.station-panel__line {
  display: grid;
  grid-template-columns: 1.5rem 1fr;
  align-items: center;
  column-gap: 0.6rem;
}

.station-panel__swatch {
  height: 0.45rem;
  border-radius: 999px;
}

.station-panel__line-name {
  font-weight: 650;
}

.station-panel__neighbours {
  display: flex;
  flex-wrap: wrap;
  grid-column: 2;
  gap: 0 0.75rem;
}

.station-panel__neighbour {
  min-height: 2.75rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.9375rem;
  text-decoration: underline;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.22em;
  cursor: pointer;
}

.station-panel__neighbour:hover {
  color: var(--ink);
}

.station-panel__seen {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

/* Przyciski zostają na dole panelu, także gdy treść się przewija. */
.station-panel__actions {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-inline: calc(-1 * var(--sheet-pad));
  padding: 0.75rem var(--sheet-pad) max(var(--sheet-pad), env(safe-area-inset-bottom));
  border-top: 1px solid var(--hairline);
  background: var(--surface);
}

.station-panel__main {
  grid-column: 1 / -1;
}
</style>
