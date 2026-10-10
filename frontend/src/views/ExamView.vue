<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ExamMenu from '@/components/exam/ExamMenu.vue'
import NextStepButton from '@/components/exam/NextStepButton.vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import MapLegend from '@/components/map/MapLegend.vue'
import MetroMap from '@/components/map/MetroMap.vue'
import PassengerSymbol from '@/components/map/PassengerSymbol.vue'
import StationPanel from '@/components/map/StationPanel.vue'
import TopicList from '@/components/map/TopicList.vue'
import { useMapTheme } from '@/composables/useMapTheme'
import { useMapView } from '@/composables/useMapView'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { EXAMS } from '@/config/exams'
import type { DiagnosticSheets } from '@/maps/nextStep'
import type { MapProgress, TopicMap } from '@/maps/types'

// Ta sama strona dla każdego egzaminu; mapę i postęp ucznia podaje router.
const props = defineProps<{
  map: TopicMap
  progress: MapProgress<string>
  sheets: DiagnosticSheets
}>()

const exam = computed(() => EXAMS.find((item) => item.id === props.map.examId)!)
const { theme, setTheme } = useMapTheme()
const { view, setView } = useMapView()

const desktop = useMediaQuery('(min-width: 64rem) and (orientation: landscape)')
const beside = useMediaQuery('(min-width: 48rem) and (orientation: landscape)')

const selected = ref<string>()
const collapsed = ref(false)
const legendOpen = ref(false)
const metroMap = useTemplateRef<InstanceType<typeof MetroMap>>('metroMap')
const list = useTemplateRef<InstanceType<typeof TopicList>>('list')
const panel = useTemplateRef<InstanceType<typeof StationPanel>>('panel')
const drawer = useTemplateRef<HTMLDialogElement>('drawer')
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')
const collapseButton = useTemplateRef<HTMLButtonElement>('collapseButton')
const expandButton = useTemplateRef<HTMLButtonElement>('expandButton')
const legendButton = useTemplateRef<HTMLButtonElement>('legendButton')

const sheetHeight = ref(0)
let sheetObserver: ResizeObserver | undefined

const floatingPill = computed(() => !beside.value && !selected.value)
// Zapas pod mapą w pikselach: pigułka 3rem i po 1rem odstępu nad nią i pod nią.
const PILL_SPACE = 80
const bottomInset = computed(() => {
  if (beside.value) return 0
  return selected.value ? sheetHeight.value : PILL_SPACE
})

watch(
  () => panel.value?.$el as Element | undefined,
  (element, previous) => {
    if (previous) sheetObserver?.unobserve(previous)
    if (element) sheetObserver?.observe(element)
    else sheetHeight.value = 0
  },
)

onMounted(() => {
  sheetObserver = new ResizeObserver(([entry]) => {
    sheetHeight.value = entry ? entry.target.getBoundingClientRect().height : 0
  })
})

onBeforeUnmount(() => sheetObserver?.disconnect())

// Przejście z menu na inny egzamin zostawia tę samą stronę, więc wybrana stacja z poprzedniej
// mapy nie może przetrwać zmiany.
watch(
  () => props.map,
  () => {
    selected.value = undefined
    legendOpen.value = false
  },
)

function select(id: string | undefined) {
  selected.value = id
  if (id) collapsed.value = false
}

function close() {
  const id = selected.value
  selected.value = undefined
  if (id) nextTick(() => (view.value === 'list' ? list.value : metroMap.value)?.focusStation(id))
}

async function collapse() {
  collapsed.value = true
  await nextTick()
  expandButton.value?.focus()
}

async function expand() {
  collapsed.value = false
  await nextTick()
  collapseButton.value?.focus()
}

function toggleLegend() {
  if (legendOpen.value) return closeLegend()
  selected.value = undefined
  collapsed.value = false
  legendOpen.value = true
}

function closeLegend() {
  legendOpen.value = false
  nextTick(() => legendButton.value?.focus())
}

function openDrawer() {
  // Bez tego Esc zamknąłby naraz szufladę i panel stacji pod nią.
  selected.value = undefined
  drawer.value?.showModal()
}

function closeDrawer() {
  drawer.value?.close()
}

function closeOutside(event: MouseEvent) {
  if (event.target === drawer.value) closeDrawer()
}
</script>

<template>
  <div class="exam-page">
    <svg class="exam-page__sprite" aria-hidden="true">
      <defs>
        <PassengerSymbol />
      </defs>
    </svg>
    <header class="exam-page__top">
      <button
        v-if="!desktop"
        ref="menuButton"
        type="button"
        class="icon-button exam-page__menu-button"
        aria-label="Menu"
        aria-haspopup="dialog"
        @click="openDrawer"
      >
        <AppIcon name="menu" />
      </button>
      <h1 class="exam-page__title" :style="{ '--marker-fill': `var(--exam-${exam.id})` }">
        <StationMarker :shape="exam.solid" class="exam-page__marker" />
        <span class="exam-page__name">{{ exam.name }}</span>
      </h1>
      <div class="exam-page__tools">
        <div class="exam-page__views" role="group" aria-label="Widok tematów">
          <button type="button" :aria-pressed="view === 'map'" @click="setView('map')">Mapa</button>
          <button type="button" :aria-pressed="view === 'list'" @click="setView('list')">
            Lista
          </button>
        </div>
        <button
          ref="legendButton"
          type="button"
          class="exam-page__chip"
          :aria-expanded="legendOpen"
          @click="toggleLegend"
        >
          Legenda
        </button>
        <NextStepButton
          v-if="beside && !desktop"
          :map="map"
          :progress="progress"
          :sheets="sheets"
        />
        <button
          type="button"
          class="icon-button exam-page__theme"
          aria-label="Ciemny motyw"
          :aria-pressed="theme === 'dark'"
          @click="setTheme(theme === 'dark' ? 'light' : 'dark')"
        >
          <AppIcon name="theme" />
        </button>
      </div>
      <RouterLink
        class="icon-button exam-page__profile"
        :to="{ name: 'coming-soon' }"
        aria-label="Profil"
      >
        <AppIcon name="profile" />
      </RouterLink>
    </header>

    <div class="exam-page__body">
      <aside v-if="desktop" class="exam-side" :class="{ 'exam-side--collapsed': collapsed }">
        <button
          v-if="collapsed"
          ref="expandButton"
          type="button"
          class="exam-side__bar"
          aria-label="Rozwiń menu"
          aria-expanded="false"
          @click="expand"
        >
          <AppIcon name="chevron-right" />
        </button>
        <StationPanel
          v-else-if="selected"
          ref="panel"
          :map="map"
          :progress="progress"
          :station-id="selected"
          @close="close"
          @select="selected = $event"
        />
        <MapLegend v-else-if="legendOpen" :map="map" @close="closeLegend" />
        <div v-else class="exam-side__menu">
          <button
            ref="collapseButton"
            type="button"
            class="icon-button exam-page__corner"
            aria-label="Zwiń menu"
            aria-expanded="true"
            @click="collapse"
          >
            <AppIcon name="chevron-left" />
          </button>
          <NextStepButton
            class="exam-side__next"
            :map="map"
            :progress="progress"
            :sheets="sheets"
          />
          <ExamMenu />
        </div>
      </aside>
      <Transition v-else name="station-panel">
        <StationPanel
          v-if="selected"
          ref="panel"
          class="exam-page__panel"
          :map="map"
          :progress="progress"
          :station-id="selected"
          @close="close"
          @select="selected = $event"
        />
      </Transition>
      <main class="exam-page__map">
        <MetroMap
          v-if="view === 'map'"
          ref="metroMap"
          :map="map"
          :progress="progress"
          :selected="selected"
          :bottom-inset="bottomInset"
          @select="select"
        >
          <template v-if="legendOpen && !desktop" #before>
            <MapLegend class="exam-page__legend" :map="map" @close="closeLegend" />
          </template>
        </MetroMap>
        <TopicList
          v-else
          ref="list"
          :map="map"
          :progress="progress"
          :selected="selected"
          :bottom-inset="bottomInset"
          @select="select"
        >
          <template v-if="legendOpen && !desktop" #before>
            <MapLegend class="exam-page__legend" :map="map" @close="closeLegend" />
          </template>
        </TopicList>
      </main>
    </div>

    <NextStepButton
      v-if="floatingPill"
      class="exam-page__next"
      :map="map"
      :progress="progress"
      :sheets="sheets"
    />

    <dialog
      v-if="!desktop"
      ref="drawer"
      class="drawer"
      aria-label="Menu"
      @click="closeOutside"
      @close="menuButton?.focus()"
    >
      <div class="drawer__inner">
        <button
          type="button"
          class="icon-button exam-page__corner"
          aria-label="Zamknij menu"
          @click="closeDrawer"
        >
          <AppIcon name="close" />
        </button>
        <ExamMenu @navigate="closeDrawer" />
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.exam-page {
  --page-top: calc(2 * var(--header-h));
}

.exam-page__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 0.25rem;
  height: var(--page-top);
  padding-inline: var(--gutter);
  border-bottom: 1px solid var(--hairline);
}

.exam-page__menu-button {
  margin-left: -0.625rem;
}

.exam-page__title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  margin-right: auto;
  font-size: 1.0625rem;
  font-weight: 700;
}

.exam-page__marker {
  flex: none;
  font-size: 1.25rem;
}

.exam-page__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exam-page__profile {
  margin-right: -0.625rem;
}

.exam-page__body {
  display: flex;
}

.exam-page__map {
  flex: 1;
  min-width: 0;
  height: calc(100svh - var(--page-top));
  padding: 1rem var(--gutter);
}

.exam-page__tools {
  display: flex;
  flex-basis: 100%;
  order: 1;
  align-items: center;
  gap: 0.5rem;
}

.exam-page__sprite {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.exam-page__views {
  display: inline-flex;
  height: 2.25rem;
  padding: 0.125rem;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
}

.exam-page__views button {
  padding: 0 0.85rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.exam-page__views button:hover {
  background: var(--hairline);
}

.exam-page__views button[aria-pressed='true'] {
  background: var(--ink);
  color: var(--ground);
}

.exam-page__chip {
  display: inline-flex;
  align-items: center;
  min-height: 2.25rem;
  padding: 0 1rem;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.exam-page__chip:hover {
  border-color: var(--ink);
}

.exam-page__chip[aria-expanded='true'] {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--ground);
}

/* Na dotyk pole kliknięcia sięga 44 px wysokości, choć pigułka zostaje niższa. */
@media (pointer: coarse) {
  .exam-page__views button,
  .exam-page__chip {
    position: relative;
  }

  .exam-page__views button::after,
  .exam-page__chip::after {
    position: absolute;
    inset: calc((2.75rem - 100%) / -2) 0;
    content: '';
  }
}

.exam-page__theme {
  margin-right: -0.625rem;
  margin-left: auto;
}

.exam-page__next {
  position: fixed;
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: 50%;
  z-index: 5;
  max-width: calc(100% - 2 * var(--gutter));
  /* transform, a nie translate, bo translate zajmuje już wciśnięty przycisk. */
  transform: translateX(-50%);
}

.exam-side__next {
  display: flex;
  width: calc(100% - 3.25rem);
  margin: -0.625rem 0 1.25rem;
}

.exam-page__legend {
  flex: none;
  margin-bottom: 1rem;
  border-radius: 1.25rem;
}

.exam-page__corner {
  position: absolute;
  top: calc(var(--sheet-pad) - 0.5rem);
  right: calc(var(--sheet-pad) - 0.625rem);
}

.exam-side {
  flex: none;
  width: 22rem;
  height: calc(100svh - var(--page-top));
  overflow-y: auto;
  /* Stałe miejsce na pasek przewijania, żeby X panelu i „<” menu stały w tym samym punkcie. */
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  border-right: 1px solid var(--hairline);
  background: var(--surface);
}

.exam-side--collapsed {
  width: 3rem;
  overflow: hidden;
}

.exam-side__menu,
.drawer__inner {
  position: relative;
  padding: var(--sheet-pad) calc(var(--sheet-pad) - 0.75rem);
}

.exam-side__bar {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: calc(var(--sheet-pad) + 0.125rem) 0 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.exam-side__bar:hover {
  background: var(--hairline);
}

.exam-side__bar:focus-visible {
  outline-offset: -3px;
}

.drawer {
  inset: 0 auto 0 0;
  width: min(22rem, 100vw - 3.5rem);
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  border-right: 1px solid var(--hairline);
  background: var(--surface);
  color: var(--ink);
  box-shadow: 10px 0 24px rgb(29 31 34 / 0.12);
  scrollbar-width: thin;
}

.drawer::backdrop {
  background: transparent;
}

.drawer__inner {
  min-height: 100%;
}

.exam-page__panel {
  position: fixed;
  inset: auto 0 0;
  z-index: 10;
  max-height: min(70svh, 36rem);
  overflow-y: auto;
  border-top: 1px solid var(--hairline);
  border-radius: 1.25rem 1.25rem 0 0;
  box-shadow: 0 -10px 24px rgb(29 31 34 / 0.12);
}

@media (min-width: 48rem) and (orientation: landscape) {
  .exam-page {
    --page-top: var(--header-h);
  }

  .exam-page__tools {
    flex-basis: auto;
    order: 0;
  }

  .exam-page__theme {
    margin-right: 0;
  }

  .exam-page__panel {
    position: static;
    flex: none;
    width: 22rem;
    height: calc(100svh - var(--page-top));
    max-height: none;
    border-top: 0;
    border-right: 1px solid var(--hairline);
    border-radius: 0;
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .station-panel-enter-active {
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .station-panel-leave-active {
    transition: transform 0.15s ease-in;
  }

  .station-panel-enter-from,
  .station-panel-leave-to {
    transform: translateY(100%);
  }

  @media (min-width: 48rem) and (orientation: landscape) {
    .station-panel-enter-from,
    .station-panel-leave-to {
      transform: translateX(-100%);
    }
  }

  .drawer {
    translate: -100% 0;
    transition:
      translate 0.25s cubic-bezier(0.22, 1, 0.36, 1),
      display 0.25s allow-discrete,
      overlay 0.25s allow-discrete;
  }

  .drawer[open] {
    translate: 0 0;
  }

  @starting-style {
    .drawer[open] {
      translate: -100% 0;
    }
  }
}
</style>
