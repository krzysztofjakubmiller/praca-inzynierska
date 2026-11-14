<script setup lang="ts">
import { computed, ref } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { BASIC_MAP, EXTENDED_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import { EXTENDED_DEMO_PROGRESS } from '@/maps/extended/demoProgress'
import { DIFFICULTY_NAMES } from '@/maps/progress'
import type { MapProgress, TopicMap } from '@/maps/types'
import {
  CREW,
  CREW_INTRO,
  CREW_TITLE,
  MAP_ROUTES,
  WHO_LABELS,
  daysToExam,
  tidy,
} from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import { vReveal } from '@/landing2/reveal'
import { plural } from '@/utils/plural'
import { formatPrice } from '@/utils/tickets'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import TicketCard from '@/components/landing/TicketCard.vue'
import DutyChat from '@/components/landing2/DutyChat.vue'
import FaqList from '@/components/landing2/FaqList.vue'
import FounderSlot from '@/components/landing2/FounderSlot.vue'
import OpinionList from '@/components/landing2/OpinionList.vue'
import SolidFigure from '@/components/landing2/SolidFigure.vue'
import StepList from '@/components/landing2/StepList.vue'
import TrialTask from '@/components/landing2/TrialTask.vue'
import WhoIcon from '@/components/landing2/WhoIcon.vue'
import MetroMap from '@/components/map/MetroMap.vue'

const { today, year, cheapest, annualMonths, validUntil } = useOffer()

// Wizytówka pokazuje te same mapy co aplikacja, z postępem przykładowego ucznia.
const MAPS: { map: TopicMap; progress: MapProgress<string> }[] = [
  { map: BASIC_MAP, progress: BASIC_DEMO_PROGRESS },
  { map: EXTENDED_MAP, progress: EXTENDED_DEMO_PROGRESS },
]

const shown = ref(0)
const selected = ref<string>()
const current = computed(() => MAPS[shown.value]!)
const exam = computed(() => EXAMS.find((item) => item.id === current.value.map.examId)!)
const station = computed(() =>
  selected.value ? current.value.map.graph.stations[selected.value] : undefined,
)

const stationCount = Object.keys(BASIC_MAP.graph.stations).length
const stationWord = plural(stationCount, ['stacja', 'stacje', 'stacji'])

const LEGEND = [
  { mark: 'shape', text: 'Kształt stacji to trudność tematu.' },
  { mark: 'ring', text: 'Kontur zapełnia się, gdy robisz zadania.' },
  { mark: 'crowd', text: 'Pasażerowie to zadania, które czekają na powtórkę.' },
  { mark: 'last', text: 'Pomarańczowy pierścień: tu ostatnio skończyłeś.' },
]

function show(index: number) {
  shown.value = index
  selected.value = undefined
}

function daysLeft(item: Exam): string {
  const days = daysToExam(item.id, today)
  return `${days} ${plural(days, ['dzień', 'dni', 'dni'])}`
}
</script>

<template>
  <div class="vf">
    <header class="vf-top">
      <a class="vf-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <nav class="vf-top__nav" aria-label="Sekcje">
        <a href="#mapa">Mapa</a>
        <a href="#ludzie">Kto to robi</a>
        <a href="#bilety">Bilety</a>
      </nav>
      <RouterLink class="vf-top__login" :to="{ name: 'login' }">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="vf-hero" aria-labelledby="vf-title">
        <h1 id="vf-title" class="vf-hero__title">
          {{ stationCount }} {{ stationWord }} do matury.
          <span>Wiesz, na której jesteś.</span>
        </h1>
        <div class="vf-hero__side">
          <p class="vf-hero__lead">
            {{
              tidy(
                'Cała matura z matematyki to mapa tematów. Aplikacja pokazuje, które stacje masz za sobą, do których wrócić i co zrobić dziś.',
              )
            }}
          </p>
          <div class="vf-actions">
            <RouterLink class="button" :to="{ name: 'register' }">
              Załóż konto
              <ArrowIcon />
            </RouterLink>
            <a v-if="cheapest" class="button button--quiet" href="#bilety">
              Bilety już od {{ formatPrice(cheapest.price) }}
            </a>
          </div>
        </div>
      </section>

      <section id="mapa" class="vf-screen" aria-labelledby="vf-map-title">
        <div class="vf-screen__bar">
          <h2 id="vf-map-title" class="vf-screen__title">To jest ekran z aplikacji</h2>
          <div class="vf-tabs" role="group" aria-label="Egzamin">
            <button
              v-for="(item, index) in MAPS"
              :key="item.map.examId"
              class="vf-tabs__tab"
              type="button"
              :aria-pressed="shown === index"
              @click="show(index)"
            >
              {{ EXAMS.find((one) => one.id === item.map.examId)!.shortName }}
            </button>
          </div>
        </div>

        <div class="vf-screen__map">
          <MetroMap
            :key="current.map.examId"
            :map="current.map"
            :progress="current.progress"
            :selected="selected"
            @select="selected = $event"
          />
        </div>

        <div class="vf-screen__foot" aria-live="polite">
          <div v-if="station" class="vf-station">
            <h3 class="vf-station__name">{{ station.name }}</h3>
            <p class="vf-station__meta">temat {{ DIFFICULTY_NAMES[station.difficulty] }}</p>
            <p>{{ station.description }}</p>
          </div>
          <p v-else class="vf-screen__hint">
            Dotknij stacji, żeby zobaczyć temat. Postęp na mapie jest przykładowy: twoja zaczyna się
            pusta.
          </p>
          <RouterLink
            v-if="MAP_ROUTES[exam.id]"
            class="button vf-screen__open"
            :to="{ name: MAP_ROUTES[exam.id] }"
          >
            Otwórz mapę
            <ArrowIcon />
          </RouterLink>
        </div>
      </section>

      <section class="vf-section" aria-label="Jak czytać mapę">
        <ul class="vf-legend">
          <li
            v-for="(item, index) in LEGEND"
            :key="item.mark"
            v-reveal="index * 80"
            class="vf-legend__item"
          >
            <span
              class="vf-legend__mark"
              :class="`vf-legend__mark--${item.mark}`"
              aria-hidden="true"
            />
            <p>{{ item.text }}</p>
          </li>
        </ul>
      </section>

      <section class="vf-section" aria-labelledby="vf-exams-title">
        <h2 id="vf-exams-title" class="vf-h2">Trzy egzaminy, trzy mapy</h2>
        <ul class="vf-exams">
          <li
            v-for="item in EXAMS"
            :id="item.id"
            :key="item.id"
            class="vf-exam"
            :style="{ '--exam': `var(--exam-${item.id})` }"
          >
            <div class="vf-exam__solid" aria-hidden="true">
              <SolidFigure :kind="item.solid" :fill="0.74" :weight="0.045" />
            </div>
            <h3 class="vf-exam__name">{{ item.name }}</h3>
            <p class="vf-exam__text">{{ tidy(item.description) }}</p>
            <p class="vf-exam__meta">
              Do egzaminu {{ daysLeft(item) }}, bilet od {{ formatPrice(item.prices.monthly) }}
            </p>
          </li>
        </ul>
      </section>

      <section id="ludzie" class="vf-section vf-crew" aria-labelledby="vf-crew-title">
        <div class="vf-crew__head">
          <h2 id="vf-crew-title" class="vf-h2">{{ CREW_TITLE }}</h2>
          <p class="vf-lead">{{ CREW_INTRO }}</p>
        </div>
        <ul class="vf-crew__list">
          <li
            v-for="(role, index) in CREW"
            :key="role.what"
            v-reveal="index * 70"
            class="vf-role"
            :class="`vf-role--${role.who}`"
          >
            <span class="vf-role__icon"><WhoIcon :who="role.who" /></span>
            <div>
              <h3 class="vf-role__what">
                {{ role.what }}
                <span class="vf-role__who">{{ WHO_LABELS[role.who] }}</span>
              </h3>
              <p>{{ role.text }}</p>
            </div>
          </li>
        </ul>
        <DutyChat v-reveal class="vf-rise vf-crew__chat" />
      </section>

      <section class="vf-section" aria-label="Zadanie na próbę">
        <TrialTask v-reveal class="vf-rise" />
      </section>

      <section id="jak-to-dziala" class="vf-section vf-split" aria-labelledby="vf-steps-title">
        <div class="vf-split__head">
          <h2 id="vf-steps-title" class="vf-h2">Jak to działa</h2>
          <p class="vf-lead">
            {{
              tidy(
                'Zadania rozwiązujesz w zeszycie, tak jak na egzaminie, a aplikacja prowadzi cię od tematu do tematu.',
              )
            }}
          </p>
        </div>
        <StepList />
      </section>

      <section class="vf-section" aria-labelledby="vf-voices-title">
        <h2 id="vf-voices-title" class="vf-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="vf-section" aria-labelledby="vf-founder-title">
        <h2 id="vf-founder-title" class="vf-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section id="bilety" class="vf-section vf-split" aria-labelledby="vf-tickets-title">
        <div class="vf-split__head">
          <h2 id="vf-tickets-title" class="vf-h2">Bilety</h2>
          <p class="vf-lead">
            {{
              tidy(
                'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
              )
            }}
          </p>
        </div>
        <ol class="vf-tickets">
          <li v-for="(item, index) in EXAMS" :key="item.id">
            <TicketCard
              :exam="item"
              :valid-until="validUntil"
              :annual-months="annualMonths"
              :order="index"
            />
          </li>
        </ol>
      </section>

      <section class="vf-section vf-split" aria-labelledby="vf-faq-title">
        <div class="vf-split__head">
          <h2 id="vf-faq-title" class="vf-h2">Pytania</h2>
        </div>
        <FaqList />
      </section>
    </main>

    <footer class="vf-foot">
      <p>{{ PRODUCT_NAME }}, {{ year }}</p>
      <RouterLink class="button" :to="{ name: 'register' }">
        Załóż konto
        <ArrowIcon />
      </RouterLink>
    </footer>
  </div>
</template>

<style scoped>
.vf {
  --accent: #ec6d3d;
  --accent-deep: #b4430f;
  --duty: var(--accent-deep);
  --sign: var(--accent-deep);
  --step-line: var(--ink);
  --radius: 1.25rem;
  --card-shadow: 0 1px 1px rgb(29 31 34 / 0.06), 0 12px 24px -12px rgb(29 31 34 / 0.2);
  --display-stretch: 96%;
  --display-weight: 800;
  --pad: max(var(--gutter), calc((100vw - 82rem) / 2));
}

.vf ::selection {
  background: var(--accent);
  color: #1d1f22;
}

.vf-top {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: var(--header-h);
  padding-inline: var(--pad);
  border-bottom: 1px solid var(--hairline);
  background: var(--ground);
}

.vf-top__mark {
  margin-right: auto;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-decoration: none;
  white-space: nowrap;
}

.vf-top__nav {
  display: none;
  gap: 1.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
}

.vf-top__nav a {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  color: var(--ink-soft);
  text-decoration: none;
  transition: color 0.2s ease;
}

.vf-top__nav a:hover {
  color: var(--ink);
}

.vf-top__login {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 650;
  white-space: nowrap;
}

.vf-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.vf-hero {
  display: grid;
  gap: 1.5rem;
  padding: clamp(2rem, 1rem + 4.5vw, 5rem) var(--pad) clamp(1.75rem, 1rem + 3vw, 3.5rem);
}

.vf-hero__title {
  max-width: 13ch;
  font-size: clamp(3rem, 1.5rem + 7.4vw, 7.5rem);
  font-weight: 830;
  font-stretch: 96%;
  letter-spacing: -0.04em;
  line-height: 0.92;
}

.vf-hero__title span {
  display: block;
  color: var(--accent-deep);
}

.vf-hero__side {
  display: grid;
  gap: 1.25rem;
  align-content: end;
}

.vf-hero__lead {
  max-width: 40ch;
  font-size: clamp(1.1rem, 1rem + 0.55vw, 1.4rem);
  line-height: 1.4;
}

/* Ekran aplikacji: ciemny blok z prawdziwą mapą. Zmienne poniżej to ciemny motyw aplikacji,
   ustawiony tylko w tym bloku. */
.vf-screen {
  --ground: #111210;
  --surface: #080807;
  --ink: #ebece9;
  --ink-raised: #d0d1ce;
  --ink-soft: #a8abaf;
  --hairline: rgb(235 236 233 / 0.14);
  --line-1: #dba840;
  --line-2: #98b6fc;
  --line-3: #6fcac2;
  --line-4: #ff93a1;
  --line-5: #ef8f50;
  --line-6: #cba1fb;
  --map-outline: #626460;
  --map-last: #fe8e66;
  display: grid;
  margin-inline: max(0.5rem, calc(var(--pad) - 1rem));
  border-radius: clamp(1.25rem, 1rem + 1.5vw, 2.25rem);
  background: var(--ground);
  color: var(--ink);
  color-scheme: dark;
  box-shadow:
    0 2px 4px rgb(29 31 34 / 0.2),
    0 40px 70px -30px rgb(29 31 34 / 0.6);
  overflow: hidden;
  scroll-margin-top: calc(var(--header-h) + 0.75rem);
}

.vf-screen__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  padding: 1rem clamp(1rem, 0.5rem + 2vw, 2rem);
  border-bottom: 1px solid var(--hairline);
}

.vf-screen__title {
  font-size: clamp(1.15rem, 1rem + 0.7vw, 1.5rem);
  font-weight: 760;
  letter-spacing: -0.015em;
}

.vf-tabs {
  display: inline-flex;
  padding: 0.2rem;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
}

.vf-tabs__tab {
  min-height: 2.6rem;
  padding: 0 1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 650;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.vf-tabs__tab[aria-pressed='true'] {
  background: var(--ink);
  color: var(--ground);
}

/* Mapa w aplikacji przewija się w swoim oknie; tutaj dostaje tyle miejsca, żeby zmieścić się
   cała i nie zatrzymywać przewijania strony. */
.vf-screen__map {
  height: calc((100vw - 1rem) * 2.16);
  padding: 0.5rem;
}

.vf-screen__map :deep(.metro-map) {
  overflow: hidden;
}

.vf-screen__foot {
  display: grid;
  gap: 1rem;
  align-items: center;
  padding: 1rem clamp(1rem, 0.5rem + 2vw, 2rem) 1.25rem;
  border-top: 1px solid var(--hairline);
}

.vf-screen__hint {
  max-width: 52ch;
  color: var(--ink-soft);
}

.vf-station {
  display: grid;
  gap: 0.2rem;
  max-width: 60ch;
}

.vf-station__name {
  font-size: 1.35rem;
  font-weight: 780;
  letter-spacing: -0.015em;
}

.vf-station__meta {
  color: var(--map-last);
  font-size: 0.9375rem;
  font-weight: 650;
}

.vf-station p:last-child {
  color: var(--ink-soft);
}

.vf-screen__open {
  justify-self: start;
}

.vf-section {
  display: grid;
  gap: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
  padding: clamp(3.5rem, 2.5rem + 5vw, 7rem) var(--pad);
  scroll-margin-top: var(--header-h);
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 46rem;
}

.vf-section + .vf-section {
  border-top: 1px solid var(--hairline);
}

.vf-h2 {
  max-width: 16ch;
  font-size: clamp(2.2rem, 1.5rem + 3.6vw, 4.5rem);
  font-weight: 820;
  font-stretch: 96%;
  letter-spacing: -0.035em;
  line-height: 0.97;
}

.vf-lead {
  max-width: 44ch;
  margin-top: 1.1rem;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.45;
}

.vf-legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  gap: 1.5rem clamp(1.5rem, 3vw, 2.5rem);
  padding: 0;
  list-style: none;
}

.vf-legend__item {
  display: grid;
  gap: 0.8rem;
  align-content: start;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.3rem);
  font-weight: 600;
  line-height: 1.3;
  transition:
    opacity 0.6s ease var(--reveal-delay, 0ms),
    translate 0.8s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.vf-legend__item.is-waiting {
  opacity: 0;
  translate: 0 1.25rem;
}

/* Znaki legendy rysowane tak jak stacje na mapie. */
.vf-legend__mark {
  position: relative;
  width: 2.6rem;
  height: 2.6rem;
  border: 0.4rem solid var(--ink);
  border-radius: 50%;
  background: var(--surface);
}

.vf-legend__mark--shape {
  border-radius: 0.3rem;
}

.vf-legend__mark--ring {
  border-color: #8a8d88;
  border-top-color: var(--ink);
  border-right-color: var(--ink);
}

.vf-legend__mark--crowd::after {
  content: '';
  position: absolute;
  top: -0.55rem;
  left: 2.5rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--ink);
  box-shadow:
    0.8rem 0 0 var(--ink),
    1.6rem 0 0 var(--ink);
}

.vf-legend__mark--last {
  outline: 0.3rem solid var(--accent);
  outline-offset: 0.3rem;
}

.vf-exams {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
  gap: 2rem clamp(1.5rem, 3vw, 3rem);
  padding: 0;
  list-style: none;
}

.vf-exam {
  display: grid;
  gap: 0.6rem;
  align-content: start;
  scroll-margin-top: calc(var(--header-h) + 1rem);
}

.vf-exam__solid {
  width: min(11rem, 60%);
  aspect-ratio: 1;
  margin-left: -1rem;
  color: var(--exam);
}

.vf-exam__name {
  font-size: clamp(1.5rem, 1.2rem + 1.4vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.02;
}

.vf-exam__text {
  max-width: 40ch;
}

.vf-exam__meta {
  color: var(--ink-soft);
  font-size: 0.9375rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.vf-crew__list {
  display: grid;
  padding: 0;
  border-bottom: 1px solid var(--hairline);
  list-style: none;
}

.vf-role {
  display: flex;
  gap: 1rem;
  padding-block: 1.1rem;
  border-top: 1px solid var(--hairline);
  transition:
    opacity 0.6s ease var(--reveal-delay, 0ms),
    translate 0.8s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.vf-role.is-waiting {
  opacity: 0;
  translate: 0 1.25rem;
}

.vf-role__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--ink);
  color: var(--ground);
  font-size: 1.35rem;
}

.vf-role--duty .vf-role__icon {
  background: var(--accent);
  color: #1d1f22;
}

.vf-role__what {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.75rem;
  margin-bottom: 0.3rem;
  font-size: clamp(1.25rem, 1.1rem + 0.7vw, 1.6rem);
  font-weight: 780;
  letter-spacing: -0.018em;
  line-height: 1.15;
}

.vf-role__who {
  color: var(--ink-soft);
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 0;
}

.vf-role--duty .vf-role__who {
  color: var(--accent-deep);
}

.vf-role p {
  max-width: 46ch;
  color: var(--ink-soft);
}

.vf-rise {
  transition:
    opacity 0.7s ease,
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.vf-rise.is-waiting {
  opacity: 0;
  translate: 0 1.75rem;
}

.vf-tickets {
  display: grid;
  gap: 1.25rem;
  padding: 0;
  list-style: none;
}

.vf-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem var(--pad) 2.5rem;
  border-top: 1px solid var(--hairline);
  color: var(--ink-soft);
}

@media (min-width: 44rem) {
  .vf-top__nav {
    display: flex;
  }

  .vf-top__login {
    margin-left: 0.5rem;
  }

  .vf-screen__map {
    height: min(62vw, 44rem);
    padding: 1rem;
  }

  .vf-screen__foot {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}

@media (min-width: 60rem) {
  .vf-hero {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    align-items: end;
    column-gap: var(--gutter);
  }

  .vf-crew {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: start;
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .vf-crew__head {
    grid-column: 1 / -1;
  }

  .vf-crew__chat {
    position: sticky;
    top: calc(var(--header-h) + 1.5rem);
  }

  .vf-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .vf-split__head {
    position: sticky;
    top: calc(var(--header-h) + 2rem);
  }
}
</style>
