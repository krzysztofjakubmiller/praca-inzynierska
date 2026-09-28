<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { ANNUAL_TICKET_VALID_UNTIL, EXAMS } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { useStationProgress } from '@/composables/useStationProgress'
import { TICKET_NAMES, cheapestTicket, formatPrice } from '@/utils/tickets'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import RouteStrip from '@/components/landing/RouteStrip.vue'
import SolidCanvas from '@/components/landing/SolidCanvas.vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import TicketCard from '@/components/landing/TicketCard.vue'

const cheapest = cheapestTicket(EXAMS)
const validUntil = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(ANNUAL_TICKET_VALID_UNTIL))
const year = new Date().getFullYear()

// The description of the app, told as a ride from stop to stop.
const STEPS = [
  {
    title: 'Sprawdzasz, co umiesz',
    text: 'Zaczynasz od arkusza diagnostycznego, ułożonego jak prawdziwy egzamin. Po nim wiesz, które tematy masz opanowane, a które warto powtórzyć.',
  },
  {
    title: 'Wybierasz, od czego zacząć',
    text: 'Mapa tematów podpowiada kolejność, ale niczego nie blokuje. Możesz iść jej śladem albo wziąć dowolny temat.',
  },
  {
    title: 'Powtarzasz, zanim zapomnisz',
    text: 'Codziennie dostajesz kilka zadań. Aplikacja sama wylicza, kiedy wrócić do każdego typu zadania, a liczby za każdym razem są nowe.',
  },
  {
    title: 'Widzisz postęp',
    text: 'Co kilka tygodni rozwiązujesz podobny arkusz i porównujesz wyniki. Dostajesz też szacunkowy wynik egzaminu, podany jako przedział.',
  },
]

// Stops in the order of the ride: the start, the exam stations and the ticket office.
const stops: HTMLElement[] = []
// Resting places of the solids on phones, one per exam.
const slots: HTMLElement[] = []
const stage = useTemplateRef<HTMLElement>('stage')
const flat = ref(false)

const { position, readPosition } = useStationProgress(
  () => stops,
  () => window.innerHeight / 2,
)

// The start is stop 0, so the exam stations are counted from 1.
const activeStop = computed(() => Math.floor(position.value) - 1)
const readStations = () => readPosition() - 1
const getStage = () => stage.value
const getSlots = () => slots

function setStop(index: number, element: unknown) {
  if (element instanceof HTMLElement) stops[index] = element
}

function setSlot(index: number, element: unknown) {
  if (element instanceof HTMLElement) slots[index] = element
}
</script>

<template>
  <div class="landing" :class="{ 'landing--flat': flat }">
    <SolidCanvas
      :exams="EXAMS"
      :read-stations="readStations"
      :get-stage="getStage"
      :get-slots="getSlots"
      @unavailable="flat = true"
    />

    <header class="top">
      <a class="top__wordmark" href="#start">{{ PRODUCT_NAME }}</a>
      <RouteStrip :exams="EXAMS" :active="activeStop" />
    </header>

    <main>
      <div class="ride">
        <div ref="stage" class="ride__stage wall" aria-hidden="true" />

        <section
          id="start"
          :ref="(element) => setStop(0, element)"
          class="ride__stop start"
          aria-labelledby="start-title"
        >
          <h1 id="start-title" class="start__title">{{ PRODUCT_NAME }}</h1>
          <p class="start__lead">Nie zapamiętujesz odpowiedzi, uczysz się metody.</p>
          <p class="start__text">
            Każda powtórka to ten sam typ zadania z nowymi liczbami, a aplikacja sama pilnuje, kiedy
            do niego wrócić.
          </p>
          <a v-if="cheapest" class="button start__action" href="#bilety">
            Bilety już od {{ formatPrice(cheapest.price) }}
            <ArrowIcon down />
          </a>
        </section>

        <section
          v-for="(exam, index) in EXAMS"
          :id="exam.id"
          :key="exam.id"
          :ref="(element) => setStop(index + 1, element)"
          class="ride__stop station"
          :style="{ '--exam': `var(--exam-${exam.id})` }"
          :aria-labelledby="`${exam.id}-title`"
        >
          <div
            :ref="(element) => setSlot(index, element)"
            class="station__slot wall"
            aria-hidden="true"
          />
          <div class="station__body">
            <div class="sign">
              <StationMarker :shape="exam.solid" class="sign__marker" />
              <h2 :id="`${exam.id}-title`" class="sign__name">{{ exam.name }}</h2>
            </div>
            <p class="station__text">{{ exam.description }}</p>
          </div>
        </section>
      </div>

      <section
        id="bilety"
        :ref="(element) => setStop(EXAMS.length + 1, element)"
        class="tickets"
        aria-labelledby="bilety-title"
      >
        <div class="tickets__head">
          <div class="sign sign--ink">
            <StationMarker shape="ticket" class="sign__marker" />
            <h2 id="bilety-title" class="sign__name">Bilety</h2>
          </div>
          <p class="tickets__intro">
            Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia
            po egzaminie.
          </p>
        </div>

        <ol class="tickets__list">
          <li v-for="(exam, index) in EXAMS" :key="exam.id">
            <TicketCard :exam="exam" :valid-until="validUntil" :order="index" />
          </li>
        </ol>

        <div v-if="cheapest" class="tickets__cheapest">
          <RouterLink class="button" :to="{ name: 'coming-soon' }">
            Już od {{ formatPrice(cheapest.price) }}
            <ArrowIcon />
          </RouterLink>
          <p class="tickets__cheapest-note">
            {{ TICKET_NAMES[cheapest.kind] }}, {{ cheapest.exam.name.toLowerCase() }}
          </p>
        </div>
      </section>

      <section
        id="jak-to-dziala"
        :ref="(element) => setStop(EXAMS.length + 2, element)"
        class="about"
        aria-labelledby="jak-to-dziala-title"
      >
        <div class="about__head">
          <div class="sign sign--ink">
            <StationMarker shape="question" class="sign__marker" />
            <h2 id="jak-to-dziala-title" class="sign__name">Jak to działa</h2>
          </div>
          <p class="about__intro">
            {{ PRODUCT_NAME }} to aplikacja do nauki matematyki przed egzaminem. Zadania
            rozwiązujesz w zeszycie, tak jak na egzaminie, a aplikacja prowadzi cię od tematu do
            tematu.
          </p>
        </div>

        <ol class="about__route">
          <li v-for="step in STEPS" :key="step.title" class="about__stop">
            <h3 class="about__stop-title">{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </li>
        </ol>

        <div class="about__notes">
          <div class="about__note">
            <h3 class="about__note-title">Gdy utkniesz</h3>
            <p>
              Asystent podpowiada kolejny krok, zamiast podawać gotowe rozwiązanie. Odpowiedzi
              sprawdza program, a nie sztuczna inteligencja, więc wynik jest zawsze policzony.
            </p>
          </div>
          <div class="about__note">
            <h3 class="about__note-title">Dla rodzica</h3>
            <p>
              Rodzic może zaglądać w postępy i prace domowe dziecka, bez możliwości zmian. Jeśli
              chce, dostaje co tydzień krótkie podsumowanie mailem.
            </p>
          </div>
        </div>
      </section>
    </main>

    <footer class="foot">
      <p>{{ PRODUCT_NAME }}, {{ year }}</p>
    </footer>
  </div>
</template>

<style scoped>
.top {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  height: var(--header-h);
  padding-inline: var(--gutter);
  border-bottom: 1px solid var(--hairline);
  background: var(--ground);
}

.top__wordmark {
  font-size: 1rem;
  font-weight: 750;
  letter-spacing: -0.01em;
  text-decoration: none;
  white-space: nowrap;
}

/*
 * A tiled station wall, fading out towards its edges. Walls lie under the canvas with
 * the solids (z-index -1), the text lies above it.
 */
.wall {
  position: relative;
  z-index: -2;
}

.wall::before {
  --tile: clamp(1.75rem, 1.2rem + 1.6vw, 2.75rem);
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgb(29 31 34 / 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(29 31 34 / 0.07) 1px, transparent 1px);
  background-position: center;
  background-size: var(--tile) var(--tile);
  mask-image: radial-gradient(closest-side, #000 30%, transparent 100%);
}

/* Shared by all solids on wide screens only. */
.ride__stage {
  display: none;
}

.ride__stop {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: clamp(2rem, 1rem + 3vw, 3rem) var(--gutter) clamp(3rem, 2rem + 5vw, 5rem);
  scroll-margin-top: var(--header-h);
}

.start {
  gap: 1rem;
}

/* On phones every station has its own place for its solid, which moves with the page. */
.station {
  padding-top: 0;
}

.station__slot {
  height: clamp(13rem, 36svh, 20rem);
  margin-inline: calc(-1 * var(--gutter));
}

.landing--flat .station__slot {
  display: none;
}

.station__body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  container-type: inline-size;
}

.start__title {
  font-size: clamp(3rem, 1.4rem + 6.4vw, 6rem);
  font-weight: 800;
  font-stretch: 112%;
  letter-spacing: -0.035em;
  line-height: 0.92;
  margin-bottom: 0.15em;
}

.start__lead {
  max-width: 20ch;
  font-size: clamp(1.3rem, 1.05rem + 1.1vw, 1.9rem);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.2;
}

.start__text {
  max-width: 36ch;
  color: var(--ink-soft);
}

.start__action {
  align-self: flex-start;
  margin-top: 0.5rem;
}

/* A station sign is a thick line in the exam's colour, ending with a round cap. */
.sign {
  display: flex;
  align-items: center;
  gap: 0.28em;
  width: fit-content;
  max-width: calc(100% + var(--gutter));
  margin-left: calc(-1 * var(--gutter));
  padding: 0.2em 0.62em 0.24em var(--gutter);
  border-radius: 0 999px 999px 0;
  background: var(--exam);
  color: #fff;
  /* Sized to the column, so the longest word, ÓSMOKLASISTY, stays inside the sign. */
  font-size: min(12cqi, 4.75rem);
}

.sign__marker {
  flex: none;
  font-size: 0.6em;
}

.sign__name {
  font-size: 1em;
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: 0.005em;
  line-height: 1.02;
  text-transform: uppercase;
}

.sign--ink {
  --exam: var(--ink);
  /* An ink outline would vanish on the ink sign, so the marker is drawn inverted. */
  --marker-fill: var(--ink);
  --marker-stroke: var(--surface);
}

.station__text {
  max-width: 34ch;
  font-size: clamp(1.125rem, 1rem + 0.55vw, 1.4rem);
  line-height: 1.45;
}

.tickets {
  display: grid;
  gap: clamp(2rem, 1.5rem + 2vw, 3rem);
  padding: clamp(3.5rem, 2rem + 6vw, 7rem) var(--gutter) clamp(4rem, 2.5rem + 6vw, 7rem);
  scroll-margin-top: var(--header-h);
}

.tickets__head {
  display: grid;
  align-content: start;
  gap: 1.25rem;
  container-type: inline-size;
}

.tickets__intro {
  max-width: 34ch;
  font-size: clamp(1.125rem, 1rem + 0.55vw, 1.4rem);
  line-height: 1.45;
}

.tickets__list {
  display: grid;
  gap: 1.25rem;
  padding: 0;
  list-style: none;
}

.tickets__cheapest {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}

.tickets__cheapest-note {
  color: var(--ink-soft);
}

.about {
  display: grid;
  gap: clamp(2rem, 1.5rem + 2vw, 3rem);
  padding: clamp(3.5rem, 2rem + 6vw, 7rem) var(--gutter) clamp(4rem, 2.5rem + 6vw, 7rem);
  border-top: 1px solid var(--hairline);
  scroll-margin-top: var(--header-h);
}

.about__head {
  display: grid;
  align-content: start;
  gap: 1.25rem;
  container-type: inline-size;
}

.about__intro {
  max-width: 34ch;
  font-size: clamp(1.125rem, 1rem + 0.55vw, 1.4rem);
  line-height: 1.45;
}

/* The steps lie on one line, like stops on a metro line. */
.about__route {
  display: grid;
  padding: 0;
  list-style: none;
}

.about__stop {
  position: relative;
  padding: 0 0 2rem 2.5rem;
}

.about__stop::before {
  content: '';
  position: absolute;
  top: 0.3rem;
  left: 0;
  z-index: 1;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: var(--ink);
}

.about__stop:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 0.85rem;
  bottom: -0.3rem;
  left: 0.425rem;
  width: 0.25rem;
  background: var(--ink);
}

.about__stop:last-child {
  padding-bottom: 0;
}

.about__stop-title,
.about__note-title {
  margin-bottom: 0.35rem;
  font-size: clamp(1.25rem, 1.05rem + 0.8vw, 1.6rem);
  font-weight: 750;
  letter-spacing: -0.015em;
  line-height: 1.15;
}

.about__stop p,
.about__note p {
  max-width: 44ch;
  color: var(--ink-soft);
}

.about__notes {
  display: grid;
  gap: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--hairline);
}

.foot {
  padding: 1.75rem var(--gutter) 2.25rem;
  border-top: 1px solid var(--hairline);
  color: var(--ink-soft);
  font-size: 0.9375rem;
}

@media (min-width: 60rem) {
  .ride {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  }

  .ride__stage {
    position: sticky;
    top: var(--header-h);
    display: block;
    grid-row: 1 / span 4;
    grid-column: 2;
    align-self: start;
    height: calc(100svh - var(--header-h));
    border-left: 1px solid var(--hairline);
  }

  .ride__stop {
    grid-column: 1;
    justify-content: center;
    min-height: calc(100svh - var(--header-h));
  }

  .station {
    padding-top: clamp(2rem, 1rem + 3vw, 3rem);
  }

  .station__slot {
    display: none;
  }

  .tickets {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .tickets__head {
    position: sticky;
    top: calc(var(--header-h) + 2rem);
  }

  .tickets__list,
  .tickets__cheapest {
    grid-column: 2;
  }

  .about {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .about__head {
    position: sticky;
    top: calc(var(--header-h) + 2rem);
  }

  .about__route,
  .about__notes {
    grid-column: 2;
  }

  .about__notes {
    grid-template-columns: 1fr 1fr;
    column-gap: 2rem;
  }
}
</style>
