<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { drawMap, type MapDrawing } from '@/maps/drawing'
import type { Orientation } from '@/maps/geometry'
import type { PlacedLabel } from '@/maps/labels'
import { listOrder } from '@/maps/order'
import { DIFFICULTY_NAMES, progressShare } from '@/maps/progress'
import { stationPath } from '@/maps/shapes'
import type { MapProgress, TopicMap } from '@/maps/types'
import { TASK_FORMS, plural } from '@/utils/plural'

const props = defineProps<{
  map: TopicMap
  /** Postęp ucznia; bez niego wszystkie stacje są nieruszone. */
  progress?: MapProgress<string>
  /** Bez podanej orientacji wybiera ją kształt dostępnego miejsca. */
  orientation?: Orientation
  /** Stacja, której panel jest otwarty. */
  selected?: string
  /** Wysokość panelu przykrywającego dół mapy; mapa przewija się tak, żeby stacja była nad nim. */
  bottomInset?: number
}>()

const emit = defineEmits<{
  /** Wybrana stacja albo nic, gdy uczeń kliknął puste miejsce mapy. */
  select: [id: string | undefined]
}>()

const frame = useTemplateRef<HTMLElement>('frame')
const probe = useTemplateRef<SVGTextElement>('probe')
const size = ref<{ width: number; height: number }>()
const fontReady = ref(false)

// Etykiety mierzy ukryty tekst w tym samym SVG, więc pomiar zgadza się z tym, co widać.
const widths = new Map<string, number>()
function measure(text: string, fontSize: number, bold = false): number {
  const key = `${fontSize}|${bold}|${text}`
  let width = widths.get(key)
  if (width === undefined && probe.value) {
    probe.value.setAttribute('font-size', String(fontSize))
    probe.value.classList.toggle('metro-map__note', bold)
    probe.value.textContent = text
    width = probe.value.getComputedTextLength()
    widths.set(key, width)
  }
  return width ?? 0
}

const drawing = computed<MapDrawing | undefined>(() => {
  if (!size.value || !fontReady.value) return undefined
  return drawMap(props.map, {
    ...size.value,
    orientation: props.orientation,
    progress: props.progress,
    measure,
  })
})

function describe(id: string): string {
  const station = props.map.graph.stations[id]!
  const topic = props.progress?.topics[id]
  const parts = [
    station.name,
    `temat ${DIFFICULTY_NAMES[station.difficulty]}`,
    `zrobione ${Math.round(progressShare(topic) * 100)}%`,
  ]
  if (topic?.due) parts.push(`${topic.due} ${plural(topic.due, TASK_FORMS)} do powtórki`)
  if (props.progress?.lastStation === id) parts.push('ostatnio robiony')
  return parts.join(', ')
}

const stations = computed(() => {
  const current = drawing.value
  if (!current) return []
  const order = listOrder(props.map)
  // Pole kliknięcia ma na ekranie co najmniej 44 px średnicy, także na pomniejszonej mapie.
  const hit = 22 / current.fit
  return [...current.stations]
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    .map((station) => ({
      id: station.id,
      at: station.at,
      path: stationPath(station.difficulty, station.at, station.radius),
      share: progressShare(props.progress?.topics[station.id]),
      label: describe(station.id),
      hit: Math.max(hit, station.radius * 1.6),
      focus: station.radius * 1.75,
    }))
})

const passengers = computed(() => {
  const current = drawing.value
  if (!current) return []
  const { width, height, gap } = current.passenger
  return current.labels.flatMap((label) => {
    const count = current.stations.find((station) => station.id === label.id)?.passengers ?? 0
    if (!count || label.badgeTop === undefined) return []
    const row = count * (width + gap) - gap
    const start = {
      start: label.box.x,
      middle: label.box.x + (label.box.width - row) / 2,
      end: label.box.x + label.box.width - row,
    }[anchor(label)]
    return Array.from({ length: count }, (_, index) => ({
      key: `${label.id}-${index}`,
      x: start + index * (width + gap),
      y: label.badgeTop!,
      width,
      height,
    }))
  })
})

function anchor(label: PlacedLabel): 'start' | 'middle' | 'end' {
  if (label.side.endsWith('right')) return 'start'
  if (label.side.endsWith('left')) return 'end'
  return 'middle'
}

function anchorX(label: PlacedLabel): number {
  const { x, width } = label.box
  return { start: x, middle: x + width / 2, end: x + width }[anchor(label)]
}

function polyline(points: readonly { x: number; y: number }[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function stationElement(id: string): SVGGElement | null {
  return frame.value?.querySelector(`[data-station="${CSS.escape(id)}"]`) ?? null
}

function focusStation(id: string) {
  stationElement(id)?.focus()
}

watch(
  () => [props.selected, props.bottomInset, drawing.value] as const,
  async ([id]) => {
    await nextTick()
    const element = id ? stationElement(id) : null
    if (!element || !frame.value) return
    const box = element.getBoundingClientRect()
    const area = frame.value.getBoundingClientRect()
    const margin = 24
    const bottom = area.bottom - (props.bottomInset ?? 0) - margin
    const delta =
      box.top < area.top + margin
        ? box.top - area.top - margin
        : box.bottom > bottom
          ? box.bottom - bottom
          : 0
    if (!delta) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    frame.value.scrollBy({ top: delta, behavior: calm ? 'auto' : 'smooth' })
  },
)

let observer: ResizeObserver | undefined

function resize(width: number, height: number) {
  width = Math.floor(width)
  height = Math.floor(height)
  if (width !== size.value?.width || height !== size.value?.height) size.value = { width, height }
}

onMounted(async () => {
  if (!frame.value) return
  // Pierwszy pomiar od razu, bo obserwator zgłasza się dopiero przy najbliższym rysowaniu strony.
  resize(frame.value.clientWidth, frame.value.clientHeight)
  observer = new ResizeObserver(([entry]) => {
    if (entry) resize(entry.contentRect.width, entry.contentRect.height)
  })
  observer.observe(frame.value)
  // Polskie litery są w osobnym pliku czcionki, więc wczytujemy oba zakresy znaków.
  await document.fonts.load('550 16px "Mona Sans Variable"', 'Aa ąęłńóśźż').catch(() => [])
  fontReady.value = true
})

onBeforeUnmount(() => observer?.disconnect())

defineExpose({ drawing, focusStation })
</script>

<template>
  <div ref="frame" class="metro-map">
    <slot name="before" />
    <svg
      v-if="drawing"
      class="metro-map__svg"
      :viewBox="`${drawing.viewBox.x} ${drawing.viewBox.y} ${drawing.viewBox.width} ${drawing.viewBox.height}`"
      :width="drawing.viewBox.width * drawing.fit"
      :height="drawing.viewBox.height * drawing.fit"
      role="group"
      aria-label="Mapa tematów"
      @click="emit('select', undefined)"
    >
      <g class="metro-map__lines" :stroke-width="drawing.lineWidth" aria-hidden="true">
        <polyline
          v-for="line in drawing.lines"
          :key="line.id"
          :points="polyline(line.points)"
          :style="{ stroke: `var(--line-${line.color})` }"
        />
      </g>
      <g class="metro-map__rings" :stroke-width="drawing.strokeWidth" aria-hidden="true">
        <template v-for="station in drawing.stations" :key="station.id">
          <circle v-if="station.ring" :cx="station.at.x" :cy="station.at.y" :r="station.ring" />
        </template>
      </g>
      <g class="metro-map__stations" :stroke-width="drawing.strokeWidth">
        <g
          v-for="station in stations"
          :key="station.id"
          class="metro-map__station"
          :class="{ 'metro-map__station--selected': station.id === selected }"
          :data-station="station.id"
          role="button"
          tabindex="0"
          :aria-label="station.label"
          :aria-current="station.id === selected ? 'true' : undefined"
          @click.stop="emit('select', station.id)"
          @keydown.enter.prevent="emit('select', station.id)"
          @keydown.space.prevent="emit('select', station.id)"
        >
          <circle class="metro-map__hit" :cx="station.at.x" :cy="station.at.y" :r="station.hit" />
          <circle
            class="metro-map__focus"
            :cx="station.at.x"
            :cy="station.at.y"
            :r="station.focus"
          />
          <path class="metro-map__outline" :d="station.path" />
          <!-- pathLength="1" pozwala odciąć kawałek konturu równy części zrobionych zadań. -->
          <path
            v-if="station.share > 0"
            class="metro-map__progress"
            :d="station.path"
            pathLength="1"
            :stroke-dasharray="`${station.share} 1`"
          />
        </g>
      </g>
      <g class="metro-map__labels" :font-size="drawing.fontSize" aria-hidden="true">
        <text
          v-for="label in drawing.labels"
          :key="label.id"
          :text-anchor="anchor(label)"
          @click.stop="emit('select', label.id)"
        >
          <tspan
            v-for="(line, index) in label.lines"
            :key="index"
            :x="anchorX(label)"
            :y="label.textTop + drawing.lineHeight * (index + 0.5)"
          >
            {{ line }}
          </tspan>
          <tspan
            v-if="label.note"
            class="metro-map__note"
            :x="anchorX(label)"
            :y="label.textTop + drawing.lineHeight * (label.lines.length + 0.5)"
          >
            {{ label.note }}
          </tspan>
        </text>
      </g>
      <g class="metro-map__passengers" aria-hidden="true">
        <use
          v-for="passenger in passengers"
          :key="passenger.key"
          href="#metro-passenger"
          :x="passenger.x"
          :y="passenger.y"
          :width="passenger.width"
          :height="passenger.height"
        />
      </g>
    </svg>
    <div class="metro-map__spacer" :style="{ height: `${bottomInset ?? 0}px` }" />
    <svg class="metro-map__probe" aria-hidden="true">
      <text ref="probe" class="metro-map__labels" />
    </svg>
  </div>
</template>

<style scoped>
.metro-map {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden auto;
}

.metro-map__svg {
  flex: none;
  margin: auto;
  overflow: visible;
}

.metro-map__spacer {
  flex: none;
}

.metro-map__lines {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.metro-map__stations {
  stroke-linejoin: round;
}

.metro-map__station {
  cursor: pointer;
  outline: none;
  transform-box: fill-box;
  transform-origin: center;
}

.metro-map__station:hover,
.metro-map__station:focus-visible,
.metro-map__station--selected {
  transform: scale(1.15);
}

@media (prefers-reduced-motion: no-preference) {
  .metro-map__station {
    transition: transform 0.15s ease-out;
  }
}

.metro-map__hit {
  fill: transparent;
  stroke: none;
}

.metro-map__focus {
  fill: none;
  stroke: none;
}

.metro-map__station:focus-visible .metro-map__focus {
  stroke: var(--ink);
  stroke-width: 2;
  stroke-dasharray: 3 3;
}

.metro-map__outline {
  fill: var(--surface);
  stroke: var(--map-outline);
}

.metro-map__progress {
  fill: none;
  stroke: var(--map-progress);
  /* Przerywana kreska nie ma narożnika w punkcie startu; zaokrąglony początek domyka wierzchołek. */
  stroke-linecap: round;
}

.metro-map__labels {
  fill: var(--ink);
  font-family: var(--font-sans);
  font-weight: 550;
  /* Węższy krój mieści dłuższe nazwy obok stacji na telefonie. */
  font-stretch: 87.5%;
  dominant-baseline: central;
}

.metro-map__labels text {
  cursor: pointer;
}

.metro-map__passengers {
  fill: var(--ink);
}

.metro-map__rings {
  fill: none;
  stroke: var(--map-last);
}

.metro-map__note {
  font-weight: 750;
}

.metro-map__probe {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  visibility: hidden;
}
</style>
