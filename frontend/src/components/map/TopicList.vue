<script setup lang="ts">
import { computed, nextTick, useId, useTemplateRef, watch, type ComponentPublicInstance } from 'vue'
import StationIcon from '@/components/map/StationIcon.vue'
import { lineStops, listGroups } from '@/maps/order'
import {
  DIFFICULTY_NAMES,
  TOPIC_STATE_NAMES,
  passengerCount,
  progressShare,
  topicState,
} from '@/maps/progress'
import type { MapProgress, TopicMap } from '@/maps/types'

const props = defineProps<{
  map: TopicMap
  progress?: MapProgress<string>
  selected?: string
  /** Wysokość tego, co przykrywa dół listy; lista przewija się tak, żeby karta była nad tym. */
  bottomInset?: number
}>()

const emit = defineEmits<{ select: [id: string] }>()

const id = useId()
const frame = useTemplateRef<HTMLElement>('frame')
const cards = new Map<string, HTMLElement>()

const nameOf = (station: string) => props.map.graph.stations[station]?.name ?? station

function stop(station: string, repeat: boolean) {
  const topic = props.progress?.topics[station]
  const difficulty = props.map.graph.stations[station]!.difficulty
  return {
    id: station,
    repeat,
    name: nameOf(station),
    difficulty,
    share: progressShare(topic),
    meta: `${DIFFICULTY_NAMES[difficulty]} · ${TOPIC_STATE_NAMES[topicState(topic)]}`,
    due: topic?.due ?? 0,
    passengers: passengerCount(topic),
    last: props.progress?.lastStation === station,
    links: lineStops(props.map, station).flatMap(({ line, previous, next }) =>
      [previous, next]
        .filter((other) => other !== undefined)
        .map((other) => ({ id: other, name: nameOf(other), color: line.color })),
    ),
  }
}

const groups = computed(() =>
  listGroups(props.map).map(({ line, stops }) => ({
    line,
    stops: stops.map((item) => stop(item.id, item.repeat)),
  })),
)

const longest = computed(() =>
  groups.value.reduce(
    (best, group, index) => (group.stops.length > groups.value[best]!.stops.length ? index : best),
    0,
  ),
)

function setCard(station: string, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) cards.set(station, element)
  else cards.delete(station)
}

function focusStation(station: string) {
  cards.get(station)?.querySelector<HTMLElement>('.topic-card__open')?.focus()
}

// Wybrana karta nie może chować się pod panelem przy dolnej krawędzi. Gdy cała się nie
// zmieści, widać przynajmniej jej górę z nazwą.
watch(
  () => [props.selected, props.bottomInset] as const,
  async ([station]) => {
    await nextTick()
    const card = station ? cards.get(station) : undefined
    if (!card || !frame.value) return
    const box = card.getBoundingClientRect()
    const area = frame.value.getBoundingClientRect()
    const margin = 12
    const top = box.top - area.top - margin
    const bottom = box.bottom - (area.bottom - (props.bottomInset ?? 0) - margin)
    const delta = top < 0 ? top : bottom > 0 ? Math.min(bottom, top) : 0
    if (!delta) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    frame.value.scrollBy({ top: delta, behavior: calm ? 'auto' : 'smooth' })
  },
)

defineExpose({ focusStation })
</script>

<template>
  <div ref="frame" class="topic-list">
    <slot name="before" />
    <div
      class="topic-list__lines"
      :style="{ '--rest': groups.length - 1, '--span': groups.length }"
    >
      <section
        v-for="(group, index) in groups"
        :key="group.line.id"
        class="topic-list__line"
        :class="{ 'topic-list__line--long': index === longest }"
        :style="{ '--line': `var(--line-${group.line.color})` }"
        :aria-labelledby="`${id}-${group.line.id}`"
      >
        <h2 :id="`${id}-${group.line.id}`" class="topic-list__name">Linia {{ group.line.name }}</h2>
        <ol class="topic-list__stops">
          <li
            v-for="item in group.stops"
            :key="item.id"
            class="topic-list__stop"
            :class="{ 'topic-list__stop--repeat': item.repeat }"
          >
            <span
              class="topic-list__marker"
              :class="{ 'topic-list__marker--last': item.last && !item.repeat }"
              aria-hidden="true"
            >
              <StationIcon :difficulty="item.difficulty" :share="item.share" />
            </span>
            <button
              v-if="item.repeat"
              type="button"
              class="topic-list__pass"
              @click="emit('select', item.id)"
            >
              <span>{{ item.name }}<span class="topic-list__pass-note"> · przesiadka</span></span>
            </button>
            <article
              v-else
              :ref="(element) => setCard(item.id, element)"
              class="topic-card"
              :class="{ 'topic-card--selected': item.id === selected }"
            >
              <div class="topic-card__head">
                <h3 class="topic-card__title">
                  <button type="button" class="topic-card__open" @click="emit('select', item.id)">
                    {{ item.name }}
                  </button>
                </h3>
                <span class="topic-card__share">
                  <span class="topic-list__hidden">zrobione </span>
                  {{ Math.round(item.share * 100) }}%
                </span>
              </div>
              <p v-if="item.last" class="topic-card__note">Kontynuuj</p>
              <p class="topic-card__meta">
                {{ item.meta }}
                <template v-if="item.due">
                  · {{ item.due }} do powtórki
                  <svg
                    class="topic-card__passengers"
                    :viewBox="`0 0 ${item.passengers * 13 - 3} 16`"
                    aria-hidden="true"
                  >
                    <use
                      v-for="index in item.passengers"
                      :key="index"
                      href="#metro-passenger"
                      :x="(index - 1) * 13"
                      width="10"
                      height="16"
                    />
                  </svg>
                </template>
              </p>
              <div class="topic-card__links">
                <span :id="`${id}-${item.id}-links`" class="topic-card__links-label">
                  powiązane z
                </span>
                <ul class="topic-card__link-list" :aria-labelledby="`${id}-${item.id}-links`">
                  <li v-for="link in item.links" :key="`${link.color}-${link.id}`">
                    <button
                      type="button"
                      class="topic-card__link"
                      :style="{ '--link': `var(--line-${link.color})` }"
                      @click="emit('select', link.id)"
                    >
                      {{ link.name }}
                    </button>
                  </li>
                </ul>
              </div>
            </article>
          </li>
        </ol>
      </section>
    </div>
    <div class="topic-list__spacer" :style="{ height: `${bottomInset ?? 0}px` }" />
  </div>
</template>

<style scoped>
.topic-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden auto;
  container-type: inline-size;
}

.topic-list__lines {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  column-gap: 2.5rem;
  align-content: start;
}

/*
 * Dwie kolumny, gdy obie zmieszczą karty: najdłuższa linia w lewej przez wszystkie wiersze,
 * pozostałe po kolei w prawej. Ostatni, elastyczny wiersz przejmuje nadmiar wysokości długiej
 * linii, żeby krótkie linie nie rozjeżdżały się w pionie.
 */
@container (min-width: 44rem) {
  .topic-list__lines {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(var(--rest), auto) 1fr;
    max-width: 64rem;
  }

  .topic-list__line {
    grid-column: 2;
  }

  .topic-list__line--long {
    grid-column: 1;
    grid-row: 1 / span var(--span);
  }
}

/*
 * Linia biegnie pionowo w lewej kolumnie o szerokości --rail. Każdy wiersz rysuje jej kawałek
 * od swojej stacji do stacji w następnym wierszu, a nazwa linii rysuje początek.
 */
.topic-list__line {
  --rail: 2.25rem;
  --line-width: 0.4375rem;
  --marker-y: 1.625rem;
  --gap: 0.625rem;

  align-self: start;
  padding-bottom: 2rem;
}

.topic-list__name {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 2.25rem;
  padding-left: calc(var(--rail) + 0.5rem);
  font-size: 1rem;
  font-weight: 700;
}

.topic-list__name::before,
.topic-list__stop:not(:last-child)::before {
  position: absolute;
  left: calc(var(--rail) / 2 - var(--line-width) / 2);
  width: var(--line-width);
  background: var(--line);
  content: '';
}

.topic-list__name::before {
  top: 50%;
  bottom: calc(-1 * (var(--gap) + var(--marker-y)));
  border-radius: 999px 999px 0 0;
}

.topic-list__stops {
  display: grid;
  gap: var(--gap);
  margin-top: var(--gap);
  padding: 0;
  list-style: none;
}

.topic-list__stop {
  position: relative;
  padding-left: calc(var(--rail) + 0.5rem);
}

.topic-list__stop:not(:last-child)::before {
  top: var(--marker-y);
  height: calc(100% + var(--gap));
}

.topic-list__marker {
  position: absolute;
  top: var(--marker-y);
  left: calc(var(--rail) / 2);
  z-index: 1;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  translate: -50% -50%;
}

.topic-list__marker--last::after {
  position: absolute;
  inset: -0.125rem;
  border: 2.5px solid var(--map-last);
  border-radius: 50%;
  content: '';
}

.topic-list__pass {
  display: flex;
  align-items: center;
  min-height: calc(2 * var(--marker-y));
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 550;
  text-align: left;
  cursor: pointer;
}

.topic-list__pass:hover {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.22em;
}

.topic-list__pass-note {
  font-weight: 400;
}

.topic-card {
  position: relative;
  display: grid;
  gap: 0.3rem;
  padding: 0.875rem 1rem 1rem;
  border: 1px solid var(--hairline);
  border-radius: 1rem;
  background: var(--surface);
  transition: border-color 0.2s ease;
}

.topic-card:hover {
  border-color: var(--ink-soft);
}

.topic-card--selected,
.topic-card--selected:hover {
  border-color: var(--ink);
  box-shadow: inset 0 0 0 1px var(--ink);
}

.topic-card:has(.topic-card__open:focus-visible) {
  outline: 3px solid var(--ink);
  outline-offset: 3px;
}

.topic-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.topic-card__title {
  font-size: 1.0625rem;
  font-weight: 650;
  line-height: 1.25;
}

.topic-card__open {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.topic-card__open:focus-visible {
  outline: none;
}

.topic-card__open::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  content: '';
}

.topic-card__share {
  flex: none;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.topic-card__note {
  font-size: 0.875rem;
  font-weight: 750;
}

.topic-card__meta {
  color: var(--ink-soft);
  font-size: 0.875rem;
  line-height: 1.4;
}

.topic-card__passengers {
  display: inline-block;
  width: auto;
  height: 0.95em;
  margin-left: 0.2rem;
  vertical-align: -0.1em;
  fill: var(--ink);
}

.topic-card__links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  margin-top: 0.35rem;
}

.topic-card__links-label {
  color: var(--ink-soft);
  font-size: 0.8125rem;
}

.topic-card__link-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0;
  list-style: none;
}

.topic-card__link {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2rem;
  padding: 0 0.7rem;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 550;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.topic-card__link::before {
  width: 0.6rem;
  height: 0.25rem;
  border-radius: 999px;
  background: var(--link);
  content: '';
}

.topic-card__link:hover {
  border-color: var(--ink);
}

@media (pointer: coarse) {
  .topic-card__link::after {
    position: absolute;
    inset: -0.375rem 0;
    content: '';
  }
}

.topic-list__spacer {
  flex: none;
}

.topic-list__hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
