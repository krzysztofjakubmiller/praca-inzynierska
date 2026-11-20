<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import type { Exam } from '@/config/exams'
import { daysBetween, longDate, plural } from '@/stats/stats'
import { setTheme, theme } from '@/theme'

// Góra konta jak stacja egzaminu na wizytówce: pole w kolorze egzaminu, jego bryła, dni do
// egzaminu i zakładki konta na dolnej krawędzi. Strzałka w pigułce wraca na mapę tego egzaminu.
const props = defineProps<{
  exam: Exam
  email?: string
  /** Data egzaminu RRRR-MM-DD; bez wczytanego profilu jej nie ma i pole mówi tylko „Konto”. */
  examDate?: string
  today: string
  target?: number | null
  /** Powtórki na dziś i dni nauki z rzędu; null, dopóki uczeń nie zrobił żadnego zadania. */
  study?: { reviews: number; streak: number } | null
  tabs: { label: string; to: RouteLocationRaw; current: boolean }[]
}>()

// E8 nie ma jeszcze mapy tematów, więc jego przyciski prowadzą do strony „Wkrótce”.
const EXAM_PAGES: Partial<Record<Exam['id'], RouteLocationRaw>> = {
  'matura-podstawowa': { name: 'basic-matura' },
  'matura-rozszerzona': { name: 'extended-matura' },
}
const examPage = computed(() => EXAM_PAGES[props.exam.id] ?? { name: 'coming-soon' })
const examWord = computed(() => (props.exam.id === 'e8' ? 'egzaminu' : 'matury'))

const left = computed(() =>
  props.examDate ? Math.max(0, daysBetween(props.today, props.examDate)) : 0,
)

// Przejechana część drogi od początku roku szkolnego do egzaminu.
const travelled = computed(() => {
  if (!props.examDate) return 0
  const start = `${Number(props.examDate.slice(0, 4)) - 1}-09-01`
  const share = daysBetween(start, props.today) / daysBetween(start, props.examDate)
  return Math.min(1, Math.max(0, share))
})
</script>

<template>
  <section
    class="station"
    :style="{ '--field': `var(--exam-${exam.id})` }"
    aria-labelledby="station-title"
  >
    <header class="station__top">
      <RouterLink class="station__back" :to="examPage">
        <AppIcon name="chevron-left" class="station__chevron" />
        <StationMarker :shape="exam.solid" class="station__marker" />
        <span class="station__exam">{{ exam.name }}</span>
      </RouterLink>
      <span v-if="email" class="station__email">{{ email }}</span>
      <button
        type="button"
        class="icon-button station__theme"
        aria-label="Ciemny motyw"
        :aria-pressed="theme === 'dark'"
        @click="setTheme(theme === 'dark' ? 'light' : 'dark')"
      >
        <AppIcon name="theme" />
      </button>
    </header>

    <StationMarker :shape="exam.solid" class="station__solid" />

    <div class="station__body">
      <h1 v-if="examDate" id="station-title" class="station__title">
        <template v-if="left > 0">
          <span>{{ left }} {{ plural(left, 'dzień', 'dni', 'dni') }}</span
          >{{ ' ' }}
          <span>do {{ examWord }}</span>
        </template>
        <span v-else>{{ exam.id === 'e8' ? 'Egzamin' : 'Matura' }} dziś</span>
      </h1>
      <h1 v-else id="station-title" class="station__title">Konto</h1>
      <p class="station__date">
        {{ exam.name }}<template v-if="examDate">, {{ longDate(examDate) }}</template
        ><template v-if="target">, cel {{ target }}%</template>
      </p>

      <div v-if="examDate" class="station__route" aria-hidden="true">
        <span class="station__travelled" :style="{ width: `${travelled * 100}%` }" />
      </div>

      <div v-if="study !== undefined" class="station__today">
        <p v-if="study">
          <template v-if="study.reviews">
            Na dziś
            <strong
              >{{ study.reviews }}
              {{ plural(study.reviews, 'powtórka', 'powtórki', 'powtórek') }}</strong
            >.
          </template>
          <template v-else>Powtórki na dziś są zrobione.</template>
          <template v-if="study.streak > 1">
            Nauka bez przerwy od {{ study.streak }} dni.
          </template>
        </p>
        <p v-else>Pierwsze zadania czekają na mapie tematów.</p>
        <RouterLink
          class="button station__go"
          :to="study ? { name: 'reviews', params: { exam: exam.id } } : examPage"
        >
          <template v-if="!study">Otwórz mapę</template>
          <template v-else-if="study.reviews">Zacznij powtórki</template>
          <template v-else>Powtórz więcej</template>
          <ArrowIcon />
        </RouterLink>
      </div>
    </div>

    <nav class="station__tabs" aria-label="Konto">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.label"
        class="station__tab"
        :to="tab.to"
        :aria-current="tab.current ? 'page' : undefined"
      >
        {{ tab.label }}
      </RouterLink>
    </nav>
  </section>
</template>

<style scoped>
/* Pole w kolorze egzaminu z białymi napisami, jak sekcje egzaminów na wizytówce. Zmienne napisów
   zmieniają się tylko w polu, więc reszta konta zostaje w kolorach motywu. */
.station {
  --page-ink: var(--ink);
  position: relative;
  display: grid;
  gap: clamp(1.5rem, 1rem + 2vw, 2.5rem);
  padding: 0.75rem var(--gutter) 0;
  background: var(--field);
  color: #fff;
  overflow: clip;
}

.station > * {
  --ink: #fff;
  --ink-soft: rgb(255 255 255 / 0.86);
  --hairline: rgb(255 255 255 / 0.3);
}

.station ::selection {
  background: #fff;
  color: var(--field);
}

.station :focus-visible {
  outline-color: #fff;
}

/* Ciemna pigułka jak nagłówek wizytówki. */
.station__top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 68rem;
  height: 3.25rem;
  margin-inline: auto;
  padding-inline: 1.1rem 0.4rem;
  border-radius: 999px;
  background: #101421;
  box-shadow: 0 8px 24px -10px rgb(0 0 0 / 0.5);
}

/* Powrót na mapę: strzałka, znak egzaminu i jego nazwa, jak w nagłówku dawnego konta. */
.station__back {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  min-height: 2.75rem;
  margin: 0 auto 0 -0.6rem;
  padding: 0 0.9rem 0 0.4rem;
  border-radius: 999px;
  font-weight: 750;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.station__back:hover {
  background: rgb(255 255 255 / 0.14);
}

.station__chevron {
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
}

.station .station__marker {
  --marker-fill: var(--field);
  --marker-stroke: #fff;
  flex: none;
  font-size: 1.05rem;
}

.station__exam {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.station__email {
  display: none;
  margin-right: 0.5rem;
  color: rgb(255 255 255 / 0.72);
  font-size: 0.875rem;
}

.station__theme {
  color: #fff;
}

.station__theme:hover {
  background: rgb(255 255 255 / 0.14);
}

/* Bryła egzaminu jako duży, nieruchomy znak w tle pola. Rozmiar idzie z font-size, bo znacznik
   ma 1em; zwykła gruba kreska znacznika w tej skali byłaby za ciężka. */
.station .station__solid {
  --marker-stroke: rgb(255 255 255 / 0.9);
  --marker-fill: transparent;
  position: absolute;
  top: 4.5rem;
  right: -3rem;
  font-size: clamp(12rem, 9rem + 16vw, 24rem);
  stroke-width: 0.45;
  opacity: 0.5;
}

.station__body {
  position: relative;
  display: grid;
  gap: 1rem;
  width: 100%;
  max-width: 68rem;
  margin-inline: auto;
  padding-top: clamp(2.5rem, 1.5rem + 5vw, 6rem);
}

.station__title {
  display: grid;
  font-size: clamp(3.25rem, 1.6rem + 7vw, 7.5rem);
  font-weight: 800;
  font-stretch: 75%;
  letter-spacing: 0.002em;
  line-height: 0.88;
  text-transform: uppercase;
}

.station__date {
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  font-weight: 650;
}

.station__route {
  height: 0.35rem;
  max-width: 40rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.28);
}

.station__travelled {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #fff;
}

.station__today {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
  margin-top: 0.5rem;
}

.station__today p {
  max-width: 34ch;
  font-size: 1.0625rem;
}

.station__go {
  border-color: #fff;
  background: #fff;
  color: #101421;
}

.station__go:hover {
  background: rgb(255 255 255 / 0.88);
}

/* Zakładki siedzą na dolnej krawędzi pola jak karty segregatora; aktywna ma kolor tła strony. */
.station__tabs {
  display: flex;
  gap: 0.25rem;
  width: 100%;
  max-width: 68rem;
  margin-inline: auto;
  overflow-x: auto;
  scrollbar-width: none;
}

.station__tab {
  display: flex;
  flex: none;
  align-items: center;
  min-height: 3rem;
  padding: 0 1.25rem;
  border-radius: 0.9rem 0.9rem 0 0;
  font-weight: 700;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.station__tab:hover {
  background: rgb(255 255 255 / 0.14);
}

.station__tab[aria-current='page'] {
  background: var(--ground);
  color: var(--page-ink);
}

/* Na wąskim telefonie cztery zakładki dzielą szerokość ekranu po równo, zamiast uciekać w bok. */
@media (max-width: 30rem) {
  .station__tabs {
    gap: 0;
    width: auto;
    margin-inline: calc(-1 * var(--gutter) + 0.25rem);
  }

  .station__tab {
    flex: 1;
    justify-content: center;
    padding: 0 0.25rem;
    font-size: 0.875rem;
  }
}

@media (min-width: 48rem) {
  .station__email {
    display: block;
  }

  .station .station__solid {
    top: 5rem;
    right: max(var(--gutter), calc((100vw - 68rem) / 2));
    opacity: 0.75;
  }
}
</style>
