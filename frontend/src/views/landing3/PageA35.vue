<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { EXAMS, type Exam } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { AUDIENCE, LEAD, LEAD_SHORT, daysToExam, tidy } from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import { usePageGround } from '@/landing2/pageGround'
import { vReveal } from '@/landing2/reveal'
import {
  CREW,
  CREW_TITLE,
  FAQ,
  MAP_TEXT,
  MAP_TITLE,
  STEPS,
  STEPS_TEXT,
  TICKETS_TEXT,
} from '@/landing3/content'
import { purchaseRoute } from '@/purchase'
import { plural } from '@/utils/plural'
import { formatPrice, type TicketKind } from '@/utils/tickets'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import DutyChat from '@/components/landing2/DutyChat.vue'
import FounderSlot from '@/components/landing2/FounderSlot.vue'
import OpinionList from '@/components/landing2/OpinionList.vue'
import SolidFigure from '@/components/landing2/SolidFigure.vue'
import DepartureBoard from '@/components/landing3/DepartureBoard.vue'
import FaqList from '@/components/landing3/FaqList.vue'
import MapLegendDemo from '@/components/landing3/MapLegendDemo.vue'
import MapPhone from '@/components/landing3/MapPhone.vue'
import StepList from '@/components/landing3/StepList.vue'
import TicketPrinter from '@/components/landing3/TicketPrinter.vue'
import TrialTask from '@/components/landing3/TrialTask.vue'
import WhoIcon from '@/components/landing3/WhoIcon.vue'
import TouchValidator from '@/components/landing3/tickets/TouchValidator.vue'

// Stacje w kolorze 3.5: początek strony taki jak w wersji 2.0, niżej mapy tematów w telefonie,
// tablica odjazdów i kasownik w jednym z dwóch wariantów.
defineProps<{ printer: 'przyciski' | 'dotyk' }>()

// Po przejściu do kasownika z konkretnego egzaminu jego przycisk wciska się sam po tylu ms.
const PICK_AFTER = 1000
const BOARD_TEXT = tidy(
  'Tablica pokazuje na zmianę, ile dni zostało do egzaminu i od ilu złotych jest bilet.',
)
const BOARD_NOTICE = 'Typy zadań z egzaminu · nowe liczby w każdej powtórce'
const TOUCH_TEXT = tidy('Dotknij ceny na ekranie kasownika, a wydrukuje się twój bilet.')

const router = useRouter()
const { today, year, cheapest } = useOffer()
const map = ref<Exam['id']>('matura-podstawowa')
const machine = useTemplateRef<{
  pick: (id: Exam['id']) => void
  center: (smooth: boolean) => void
}>('machine')
let pickTimer = 0

usePageGround('#16224f')

function daysLeft(exam: Exam): string {
  const days = daysToExam(exam.id, today)
  return `${days} ${plural(days, ['dzień', 'dni', 'dni'])}`
}

// Bez egzaminu strona tylko dojeżdża do kasownika. Z egzaminem przeskakuje do niego,
// a po chwili kasownik sam drukuje bilet na ten egzamin.
function toTickets(id?: Exam['id']) {
  window.clearTimeout(pickTimer)
  machine.value?.center(!id)
  if (id) pickTimer = window.setTimeout(() => machine.value?.pick(id), PICK_AFTER)
}

async function buy(exam: Exam['id'], kind: TicketKind) {
  router.push(await purchaseRoute(exam, kind))
}

onBeforeUnmount(() => window.clearTimeout(pickTimer))
</script>

<template>
  <div class="va">
    <header class="va-top">
      <a class="va-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <nav class="va-top__nav" aria-label="Stacje">
        <a v-for="exam in EXAMS" :key="exam.id" class="va-top__stop" :href="`#${exam.id}`">
          <StationMarker :shape="exam.solid" />
          <span class="va-top__label">{{ exam.shortName }}</span>
        </a>
        <a class="va-top__stop" href="#bilety" @click.prevent="toTickets()">
          <StationMarker shape="ticket" />
          <span class="va-top__label">Bilety</span>
        </a>
      </nav>
      <RouterLink class="va-top__login" to="/wizytowka3/a/logowanie">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="va-hero va-field" aria-labelledby="va-title">
        <div class="va-hero__solids" aria-hidden="true">
          <div class="va-hero__solid va-hero__solid--e8">
            <SolidFigure kind="sphere" :spin="0.22" :fill="0.86" :weight="0.024" />
          </div>
          <div class="va-hero__solid va-hero__solid--basic">
            <SolidFigure kind="tetrahedron" :spin="-0.3" :fill="0.86" :weight="0.03" />
          </div>
          <div class="va-hero__solid va-hero__solid--extended">
            <SolidFigure kind="cube" :spin="0.36" :fill="0.86" :weight="0.032" />
          </div>
        </div>

        <div class="va-hero__body">
          <h1 id="va-title" class="va-hero__title">
            <span>Matma</span>
            <span>po kolei</span>
          </h1>
          <p class="va-hero__audience">{{ AUDIENCE }}</p>
          <p class="va-hero__lead">{{ LEAD }} {{ LEAD_SHORT }}</p>
          <div class="va-actions">
            <RouterLink class="button" :to="{ name: 'register' }">
              Załóż konto
              <ArrowIcon />
            </RouterLink>
            <a v-if="cheapest" class="va-more" href="#bilety" @click.prevent="toTickets()">
              Bilety już od {{ formatPrice(cheapest.price) }}
              <ArrowIcon down />
            </a>
          </div>
        </div>
      </section>

      <div class="va-ride">
        <section
          v-for="exam in EXAMS"
          :id="exam.id"
          :key="exam.id"
          class="va-station va-field"
          :class="`va-station--${exam.id}`"
          :aria-labelledby="`va-${exam.id}`"
        >
          <div class="va-station__figure" aria-hidden="true">
            <SolidFigure :kind="exam.solid" dots :fill="0.8" :weight="0.024" />
          </div>
          <div class="va-station__body">
            <h2 :id="`va-${exam.id}`" v-reveal class="va-station__name">
              <span v-for="word in exam.name.split(' ')" :key="word">{{ word }}</span>
            </h2>
            <p v-reveal="80" class="va-station__text">{{ tidy(exam.description) }}</p>
            <p v-reveal="140" class="va-station__days">
              Do egzaminu <strong>{{ daysLeft(exam) }}</strong>
            </p>
            <div v-reveal="200" class="va-actions">
              <a class="button" href="#mapa" @click="map = exam.id">
                Mapa tematów
                <ArrowIcon down />
              </a>
              <a
                class="button button--quiet"
                href="#bilety"
                @click.prevent="toTickets(exam.id)"
              >
                Bilet od {{ formatPrice(exam.prices.monthly) }}
              </a>
            </div>
          </div>
        </section>
      </div>

      <section id="mapa" class="va-section va-map va-field" aria-labelledby="va-map-title">
        <div class="va-map__head">
          <h2 id="va-map-title" class="va-h2">{{ MAP_TITLE }}</h2>
          <p class="va-lead">{{ MAP_TEXT }}</p>
          <MapLegendDemo />
        </div>
        <MapPhone v-model:exam="map" />
      </section>

      <section id="ludzie" class="va-section va-crew" aria-labelledby="va-crew-title">
        <div class="va-crew__main">
          <h2 id="va-crew-title" class="va-h2">{{ CREW_TITLE }}</h2>
          <ul class="va-crew__list">
            <li
              v-for="(role, index) in CREW"
              :key="role.what"
              v-reveal="index * 70"
              class="va-role"
              :class="`va-role--${role.who}`"
            >
              <span class="va-role__icon"><WhoIcon :who="role.who" /></span>
              <div class="va-role__body">
                <h3 class="va-role__what">
                  {{ role.what }}
                  <span class="va-role__who">{{ role.label }}</span>
                </h3>
                <p>{{ role.text }}</p>
              </div>
            </li>
          </ul>
        </div>
        <div v-reveal class="va-crew__chat">
          <DutyChat />
        </div>
      </section>

      <section class="va-section va-trial" aria-label="Zadanie na próbę">
        <TrialTask v-reveal />
        <RouterLink class="va-more" to="/wizytowka3/a/zadanie">
          Zobacz ekran zadania w aplikacji
          <ArrowIcon />
        </RouterLink>
      </section>

      <section id="jak-to-dziala" class="va-section va-split" aria-labelledby="va-steps-title">
        <div class="va-split__head">
          <h2 id="va-steps-title" class="va-h2">Jak to działa</h2>
          <p class="va-lead">{{ STEPS_TEXT }}</p>
        </div>
        <StepList :steps="STEPS" />
      </section>

      <section class="va-section va-voices" aria-labelledby="va-voices-title">
        <h2 id="va-voices-title" class="va-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="va-section va-founder" aria-labelledby="va-founder-title">
        <h2 id="va-founder-title" class="va-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section class="va-section va-board" aria-labelledby="va-board-title">
        <div class="va-board__head">
          <h2 id="va-board-title" class="va-h2">Rozkład jazdy</h2>
          <p class="va-lead">{{ BOARD_TEXT }}</p>
        </div>
        <DepartureBoard :today="today" @pick="toTickets">{{ BOARD_NOTICE }}</DepartureBoard>
      </section>

      <section
        id="bilety"
        class="va-section va-tickets va-field"
        aria-labelledby="va-tickets-title"
      >
        <div class="va-tickets__head">
          <h2 id="va-tickets-title" class="va-h2">Bilety</h2>
          <p class="va-lead">{{ printer === 'dotyk' ? TOUCH_TEXT : TICKETS_TEXT }}</p>
        </div>
        <TouchValidator v-if="printer === 'dotyk'" ref="machine" @taken="buy" />
        <TicketPrinter v-else ref="machine" @taken="buy" />
      </section>

      <section class="va-section va-split" aria-labelledby="va-faq-title">
        <div class="va-split__head">
          <h2 id="va-faq-title" class="va-h2">Pytania</h2>
        </div>
        <FaqList :items="FAQ" />
      </section>
    </main>

    <footer class="va-foot va-field">
      <p class="va-foot__mark">{{ PRODUCT_NAME }}</p>
      <div class="va-actions">
        <RouterLink class="button" :to="{ name: 'register' }">
          Załóż konto
          <ArrowIcon />
        </RouterLink>
      </div>
      <p class="va-foot__year">{{ year }}</p>
    </footer>
  </div>
</template>

<style scoped>
.va {
  --navy: #16224f;
  --duty: #2a66d6;
  --radius: 1.25rem;
  --card-shadow: 0 1px 1px rgb(22 34 79 / 0.06), 0 12px 24px -8px rgb(22 34 79 / 0.14);
  --display-stretch: 88%;
  --display-weight: 800;
  --step-line: var(--navy);
  --pad: max(var(--gutter), calc((100vw - 78rem) / 2));
  /* Tyle miejsca u góry okna zajmuje stały nagłówek. */
  --fit-top: 4.5rem;
  background: var(--ground);
  /* Zabrany bilet wylatuje poza sekcję; strona przycina go dopiero na swoim brzegu. */
  overflow: clip;
}

.va ::selection {
  background: var(--navy);
  color: #fff;
}

/* Pole w pełnym kolorze: tekst i przyciski odwracają się na białe przez te same zmienne. */
.va-field {
  --ink: #fff;
  --ink-raised: #e8ecf8;
  --ink-soft: rgb(255 255 255 / 0.86);
  --hairline: rgb(255 255 255 / 0.28);
  --ground: var(--field);
  background: var(--field);
  color: #fff;
}

.va-field ::selection {
  background: #fff;
  color: var(--field);
}

.va-field :focus-visible {
  outline-color: #fff;
}

.va-top {
  position: fixed;
  top: 0.6rem;
  right: var(--gutter);
  left: var(--gutter);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 68rem;
  height: 3.25rem;
  margin-inline: auto;
  padding-inline: 1.1rem 0.5rem;
  border-radius: 999px;
  background: #101421;
  color: #fff;
  box-shadow: 0 8px 24px -10px rgb(0 0 0 / 0.5);
}

.va-top__mark {
  margin-right: auto;
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.01em;
  text-decoration: none;
  white-space: nowrap;
}

.va-top__nav {
  display: none;
  align-items: center;
  gap: 0.25rem;
}

.va-top__stop {
  --marker-stroke: #fff;
  --marker-fill: transparent;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  padding-inline: 0.6rem;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.va-top__stop:hover {
  background: rgb(255 255 255 / 0.12);
}

.va-top__login {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
  padding-inline: 1rem;
  border-radius: 999px;
  background: #fff;
  color: #101421;
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.va-top :focus-visible {
  outline-color: #fff;
}

.va-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.1rem;
}

.va-more {
  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  min-height: 3rem;
  font-weight: 650;
  white-space: nowrap;
}

.va-more:hover {
  --nudge: 0.2em;
  text-decoration-thickness: 2px;
}

.va-hero {
  --field: var(--navy);
  position: relative;
  display: grid;
  align-content: end;
  gap: 1rem;
  min-height: 100svh;
  padding: 4.75rem var(--gutter) clamp(2rem, 1.5rem + 3vw, 3.5rem);
  overflow: clip;
}

.va-hero__solids {
  position: absolute;
  top: 3.75rem;
  right: 0;
  left: 0;
  height: 47svh;
}

.va-hero__solid {
  position: absolute;
  aspect-ratio: 1;
}

.va-hero__solid--e8 {
  top: 20%;
  right: -15%;
  width: 62%;
  color: #7fb0ff;
}

.va-hero__solid--basic {
  top: 36%;
  left: 1%;
  width: 45%;
  color: #4fd58d;
}

.va-hero__solid--extended {
  top: -3%;
  left: 19%;
  width: 36%;
  color: #ff7a69;
}

.va-hero__body {
  position: relative;
  display: grid;
  gap: 1rem;
  container-type: inline-size;
}

.va-hero__title {
  display: grid;
  font-size: clamp(4.25rem, 24cqi, 11.5rem);
  font-weight: 800;
  font-stretch: 75%;
  letter-spacing: -0.012em;
  line-height: 0.84;
  text-transform: uppercase;
}

.va-hero__audience {
  max-width: 40ch;
  margin-top: 0.5rem;
  font-size: clamp(1.1rem, 1rem + 0.55vw, 1.4rem);
  font-weight: 700;
  line-height: 1.25;
}

.va-hero__lead {
  max-width: 44ch;
  color: var(--ink-soft);
}

.va-hero .va-actions {
  margin-top: 0.5rem;
}

.va-station {
  position: relative;
  display: grid;
  grid-template-rows: minmax(9rem, 1fr) auto;
  gap: 1rem;
  min-height: 100svh;
  padding: 4.5rem var(--gutter) clamp(1.75rem, 1.25rem + 3vw, 3.5rem);
  overflow: clip;
  scroll-margin-top: 0;
}

.va-station--e8 {
  --field: #2a66d6;
}

.va-station--matura-podstawowa {
  --field: #168344;
}

.va-station--matura-rozszerzona {
  --field: #d42f23;
}

/* Kolejna stacja nasuwa się na poprzednią. Na niskim ekranie treść mogłaby się nie zmieścić
   w jednym widoku, więc tam stacje jadą zwyczajnie jedna pod drugą. */
@media (min-height: 38rem) {
  .va-station {
    position: sticky;
    top: 0;
  }
}

.va-station__figure {
  --solid-dot: var(--field);
  min-height: 0;
  margin-inline: calc(-1 * var(--gutter));
  color: #fff;
}

.va-station__body {
  display: grid;
  gap: 0.9rem;
  container-type: inline-size;
}

.va-station__name {
  display: grid;
  font-size: clamp(2.5rem, 15cqi, 7.5rem);
  font-weight: 800;
  font-stretch: 75%;
  letter-spacing: 0.002em;
  line-height: 0.9;
  text-transform: uppercase;
}

.va-station__text {
  max-width: 40ch;
  font-size: clamp(1.0625rem, 1rem + 0.45vw, 1.3rem);
  line-height: 1.45;
}

.va-station__days {
  font-weight: 600;
}

.va-station__days strong {
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.va-station .va-actions {
  margin-top: 0.4rem;
}

/* Wejścia: nazwa stacji wysuwa się zza krawędzi, reszta dojeżdża z dołu. */
.va :is(.va-station__text, .va-station__days, .va-actions, .va-role, .va-crew__chat, .trial) {
  transition:
    opacity 0.7s ease var(--reveal-delay, 0ms),
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.va
  :is(
    .va-station__text,
    .va-station__days,
    .va-actions,
    .va-role,
    .va-crew__chat,
    .trial
  ).is-waiting {
  opacity: 0;
  translate: 0 1.75rem;
}

/* Przycinamy słowa, a nie cały nagłówek: całkiem przycięty element nigdy nie zgłosiłby,
   że wjechał na ekran. */
.va-station__name span {
  transition: clip-path 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  clip-path: inset(-10% -5% -10% -5%);
}

.va-station__name span + span {
  transition-delay: 90ms;
}

.va-station__name.is-waiting span {
  clip-path: inset(-10% 100% -10% -5%);
}

.va-section {
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 40rem;
  position: relative;
  z-index: 1;
  display: grid;
  gap: clamp(1.5rem, 1.2rem + 1.6vw, 2.5rem);
  padding: clamp(3rem, 2.2rem + 3.2vw, 5rem) var(--pad);
  background: var(--ground);
  scroll-margin-top: 4.25rem;
}

.va-h2 {
  max-width: 18ch;
  font-size: clamp(2rem, 1.5rem + 2.4vw, 3.4rem);
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.028em;
  line-height: 1;
  text-wrap: balance;
}

.va-lead {
  max-width: 46ch;
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.va-split__head,
.va-tickets__head {
  display: grid;
  gap: 0.9rem;
  align-content: start;
}

/* Telefon z mapą stoi na granatowym polu; panel z przyciskami ma kolor obudowy kasownika. */
.va-map {
  --field: var(--navy);
  --tp-body: #0b1027;
}

.va-map__head,
.va-board__head {
  display: grid;
  gap: 0.9rem;
  align-content: start;
}

/* Tablica odjazdów w kolorach tej strony: granatowa płyta i żółte lampki. */
.va-board {
  --board-body: #101421;
  --board-flap: #232a42;
  --board-flap-info: #2c2f3d;
  --board-lamp: #ffd35c;
}

.va-crew__main {
  display: grid;
  gap: clamp(1.25rem, 1rem + 1.2vw, 2rem);
}

.va-crew__list {
  display: grid;
  padding: 0;
  border-bottom: 1px solid var(--hairline);
  list-style: none;
}

.va-role {
  display: flex;
  gap: 1rem;
  padding-block: 0.95rem;
  border-top: 1px solid var(--hairline);
}

.va-role__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--navy);
  color: #fff;
  font-size: 1.35rem;
}

.va-role--sheet .va-role__icon {
  background: #168344;
}

.va-role--duty .va-role__icon {
  background: var(--duty);
}

.va-role__what {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.75rem;
  margin-bottom: 0.25rem;
  font-size: clamp(1.2rem, 1.1rem + 0.6vw, 1.5rem);
  font-weight: 780;
  letter-spacing: -0.015em;
  line-height: 1.15;
}

.va-role__who {
  color: var(--navy);
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 0;
}

.va-role--sheet .va-role__who {
  color: #126b38;
}

.va-role--duty .va-role__who {
  color: var(--duty);
}

.va-role__body p {
  max-width: 46ch;
  color: var(--ink-soft);
}

.va-trial {
  --card: #fff;
  justify-items: start;
  background: #e6e9f2;
}

.va-trial :deep(.trial) {
  justify-self: stretch;
}

.va-voices {
  --card: #fff;
  background: #e6e9f2;
}

.va-founder {
  --sign: var(--navy);
}

/* Sekcja z kasownikiem nie może przycinać swojej zawartości, bo zabrany bilet opuszcza ją dołem
   i przelatuje nad następnymi sekcjami. */
.va-tickets {
  --field: var(--navy);
  --tp-body: #0b1027;
  --tp-screen-ink: #9fd0ff;
  --tk-button: var(--navy);
  content-visibility: visible;
  z-index: 3;
}

.va-foot {
  --field: var(--navy);
  position: relative;
  display: grid;
  gap: 1.5rem;
  padding: clamp(3rem, 2rem + 4vw, 5rem) var(--pad) 2rem;
}

.va-foot__mark {
  font-size: clamp(3.5rem, 17vw, 9.5rem);
  font-weight: 800;
  font-stretch: 75%;
  letter-spacing: -0.012em;
  line-height: 0.84;
  text-transform: uppercase;
}

.va-foot__year {
  color: var(--ink-soft);
  font-size: 0.9375rem;
}

@media (min-width: 40rem) {
  .va-top__nav {
    display: flex;
  }
}

@media (max-width: 55.99rem) {
  .va-top__stop:not(:last-child) .va-top__label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}

@media (min-width: 60rem) {
  .va-hero {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: end;
  }

  .va-hero__body {
    grid-row: 1;
    grid-column: 1;
  }

  .va-hero__solids {
    top: 4rem;
    bottom: 0;
    left: 52%;
    height: auto;
  }

  .va-hero__solid--e8 {
    top: 34%;
    right: -6%;
    width: 62%;
  }

  .va-hero__solid--basic {
    top: 44%;
    left: -4%;
    width: 46%;
  }

  .va-hero__solid--extended {
    top: 4%;
    left: 14%;
    width: 38%;
  }

  .va-station {
    grid-template-rows: none;
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: center;
  }

  .va-station__body {
    grid-row: 1;
    grid-column: 1;
  }

  .va-station__figure {
    grid-row: 1;
    grid-column: 2;
    align-self: stretch;
    margin-inline: 0;
  }

  .va-crew {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: start;
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .va-board__head {
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    align-items: end;
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .va-split,
  .va-map,
  .va-tickets {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .va-split__head,
  .va-map__head {
    position: sticky;
    top: 5.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .va-station__name span {
    transition: none;
  }
}
</style>
