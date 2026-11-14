<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import {
  CREW,
  CREW_INTRO,
  CREW_TITLE,
  LEAD,
  LEAD_SHORT,
  MAP_ROUTES,
  daysToExam,
  tidy,
} from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import { vReveal } from '@/landing2/reveal'
import { plural } from '@/utils/plural'
import { TICKET_NAMES, formatPrice, type TicketKind } from '@/utils/tickets'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import TicketCard from '@/components/landing/TicketCard.vue'
import DutyChat from '@/components/landing2/DutyChat.vue'
import FaqList from '@/components/landing2/FaqList.vue'
import FounderSlot from '@/components/landing2/FounderSlot.vue'
import OpinionList from '@/components/landing2/OpinionList.vue'
import SolidFigure from '@/components/landing2/SolidFigure.vue'
import StepList from '@/components/landing2/StepList.vue'
import TrialTask from '@/components/landing2/TrialTask.vue'

const { today, year, annualMonths, validUntil } = useOffer()

// Blady odcień papieru biletu i ciemny odcień do tekstu, po jednym na egzamin.
const PAPER: Record<Exam['id'], { tint: string; deep: string }> = {
  e8: { tint: '#e3ebfb', deep: '#1f4fae' },
  'matura-podstawowa': { tint: '#dff1e5', deep: '#126b38' },
  'matura-rozszerzona': { tint: '#fbe5e1', deep: '#b3261b' },
}

// Napis na pieczątce kontroli dla każdego stanowiska z listy CREW, w tej samej kolejności.
const STAMPS = [
  'Ułożył człowiek',
  'Sprawdził człowiek',
  'Policzył program',
  'Zrobili ludzie',
  'Dyżurny (AI)',
]
const STAMP_TURNS = [-5, 3, -2, 4, -4]

const selected = ref<Exam['id']>('matura-podstawowa')
const kind = ref<TicketKind>('annual')

const exam = computed(() => EXAMS.find((item) => item.id === selected.value)!)
const paper = computed(() => PAPER[selected.value])
const days = computed(() => daysToExam(selected.value, today))
const rosette = Array.from({ length: 30 }, (_, index) => index * 6)

watchEffect(() => {
  document.body.style.background = paper.value.tint
})
onBeforeUnmount(() => {
  document.body.style.background = ''
})

function tilt(event: PointerEvent) {
  // Pochylenie tylko za myszą; palec przewija stronę i nie powinien kiwać biletem.
  if (event.pointerType !== 'mouse') return
  const ticket = event.currentTarget as HTMLElement
  const box = ticket.getBoundingClientRect()
  const x = (event.clientX - box.left) / box.width
  const y = (event.clientY - box.top) / box.height
  ticket.style.setProperty('--ry', `${(x - 0.5) * 7}deg`)
  ticket.style.setProperty('--rx', `${(0.5 - y) * 6}deg`)
  ticket.style.setProperty('--lean', `${x - 0.5}`)
}

function level(event: PointerEvent) {
  const ticket = event.currentTarget as HTMLElement
  ticket.style.removeProperty('--ry')
  ticket.style.removeProperty('--rx')
  ticket.style.removeProperty('--lean')
}
</script>

<template>
  <div
    class="vd"
    :style="{
      '--exam': `var(--exam-${exam.id})`,
      '--tint': paper.tint,
      '--deep': paper.deep,
    }"
  >
    <!-- Filtr daje pieczątkom nierówny brzeg tuszu. -->
    <svg class="vd-defs" aria-hidden="true">
      <filter id="vd-ink">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
        <feDisplacementMap in="SourceGraphic" scale="2.4" />
      </filter>
    </svg>

    <header class="vd-top">
      <a class="vd-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <div class="vd-pick vd-pick--small" role="radiogroup" aria-label="Egzamin">
        <label v-for="item in EXAMS" :key="item.id" class="vd-pick__option">
          <input
            v-model="selected"
            class="vd-pick__input"
            type="radio"
            name="vd-top"
            :value="item.id"
          />
          <StationMarker :shape="item.solid" />
          <span class="vd-pick__label">{{ item.shortName }}</span>
        </label>
      </div>
      <RouterLink class="vd-top__login" :to="{ name: 'login' }">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="vd-hero" aria-labelledby="vd-title">
        <div class="vd-hero__body">
          <h1 id="vd-title" class="vd-hero__title">{{ PRODUCT_NAME }}</h1>
          <p class="vd-hero__lead">{{ LEAD }} {{ LEAD_SHORT }}</p>
          <fieldset class="vd-ask">
            <legend class="vd-ask__legend">Dokąd jedziesz?</legend>
            <div class="vd-pick">
              <label v-for="item in EXAMS" :key="item.id" class="vd-pick__option">
                <input
                  v-model="selected"
                  class="vd-pick__input"
                  type="radio"
                  name="vd-hero"
                  :value="item.id"
                />
                <StationMarker :shape="item.solid" />
                <span>{{ item.shortName }}</span>
              </label>
            </div>
          </fieldset>
        </div>

        <div class="vd-printer">
          <div class="vd-printer__slot" aria-hidden="true" />
          <Transition name="vd-print" mode="out-in">
            <div :key="exam.id" class="vd-ticket" @pointermove="tilt" @pointerleave="level">
              <article class="vd-ticket__paper">
                <div class="vd-ticket__main">
                  <p class="vd-ticket__micro" aria-hidden="true">
                    {{ `${PRODUCT_NAME} · `.repeat(14) }}
                  </p>
                  <div class="vd-ticket__route" aria-hidden="true">
                    <span>Start</span>
                    <span class="vd-ticket__track" />
                    <StationMarker :shape="exam.solid" class="vd-ticket__marker" />
                  </div>
                  <h2 class="vd-ticket__name">
                    <span v-for="word in exam.name.split(' ')" :key="word">{{ word }}</span>
                  </h2>

                  <div class="vd-seal" aria-hidden="true">
                    <svg class="vd-seal__rosette" viewBox="-50 -50 100 100">
                      <ellipse
                        v-for="angle in rosette"
                        :key="angle"
                        rx="47"
                        ry="17"
                        :transform="`rotate(${angle})`"
                      />
                    </svg>
                    <div class="vd-seal__solid">
                      <SolidFigure :kind="exam.solid" :fill="0.86" :weight="0.045" :spin="0.45" />
                    </div>
                  </div>

                  <div class="vd-kind" role="group" aria-label="Rodzaj biletu">
                    <button
                      v-for="option in ['annual', 'monthly'] as const"
                      :key="option"
                      class="vd-kind__option"
                      type="button"
                      :aria-pressed="kind === option"
                      @click="kind = option"
                    >
                      {{ TICKET_NAMES[option] }}
                    </button>
                  </div>

                  <dl class="vd-fields">
                    <div>
                      <dt>Cena</dt>
                      <dd class="vd-fields__price">{{ formatPrice(exam.prices[kind]) }}</dd>
                    </div>
                    <div>
                      <dt>Ważny</dt>
                      <dd>
                        {{ kind === 'annual' ? `do ${validUntil}` : 'miesiąc, przedłużasz sam' }}
                      </dd>
                    </div>
                    <div>
                      <dt>Do egzaminu</dt>
                      <dd>{{ days }} {{ plural(days, ['dzień', 'dni', 'dni']) }}</dd>
                    </div>
                  </dl>
                  <div class="vd-ticket__foil" aria-hidden="true" />
                </div>
                <div class="vd-ticket__stub">
                  <RouterLink class="button" :to="{ name: 'coming-soon' }">
                    Kup bilet
                    <ArrowIcon />
                  </RouterLink>
                  <span class="vd-ticket__code" aria-hidden="true" />
                </div>
              </article>
            </div>
          </Transition>
        </div>
      </section>

      <section class="vd-section vd-split" aria-labelledby="vd-route-title">
        <div class="vd-split__head">
          <h2 id="vd-route-title" class="vd-h2">Trasa: {{ exam.name.toLowerCase() }}</h2>
          <p class="vd-lead">{{ tidy(exam.description) }}</p>
          <div class="vd-actions">
            <RouterLink class="button" :to="{ name: 'register' }">
              Załóż konto
              <ArrowIcon />
            </RouterLink>
            <RouterLink
              v-if="MAP_ROUTES[exam.id]"
              class="button button--quiet"
              :to="{ name: MAP_ROUTES[exam.id] }"
            >
              Mapa tematów
            </RouterLink>
          </div>
        </div>
        <StepList />
      </section>

      <section id="ludzie" class="vd-section" aria-labelledby="vd-crew-title">
        <div>
          <h2 id="vd-crew-title" class="vd-h2">{{ CREW_TITLE }}</h2>
          <p class="vd-lead">{{ CREW_INTRO }}</p>
        </div>
        <ul class="vd-control">
          <li v-for="(role, index) in CREW" :key="role.what" class="vd-check">
            <div
              v-reveal="index * 110"
              class="vd-stamp"
              :class="`vd-stamp--${role.who}`"
              :style="{ '--turn': `${STAMP_TURNS[index]}deg` }"
            >
              <span class="vd-stamp__ink">{{ STAMPS[index] }}</span>
            </div>
            <h3 class="vd-check__what">{{ role.what }}</h3>
            <p>{{ role.text }}</p>
          </li>
        </ul>
      </section>

      <section class="vd-section vd-duo" aria-label="Dyżurny i zadanie na próbę">
        <DutyChat v-reveal class="vd-rise" />
        <TrialTask v-reveal="120" class="vd-rise vd-duo__trial" />
      </section>

      <section class="vd-section" aria-labelledby="vd-voices-title">
        <h2 id="vd-voices-title" class="vd-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="vd-section" aria-labelledby="vd-founder-title">
        <h2 id="vd-founder-title" class="vd-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section id="bilety" class="vd-section vd-split" aria-labelledby="vd-tickets-title">
        <div class="vd-split__head">
          <h2 id="vd-tickets-title" class="vd-h2">Wszystkie bilety</h2>
          <p class="vd-lead">
            {{
              tidy(
                'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
              )
            }}
          </p>
        </div>
        <ol class="vd-tickets">
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

      <section class="vd-section vd-split" aria-labelledby="vd-faq-title">
        <div class="vd-split__head">
          <h2 id="vd-faq-title" class="vd-h2">Pytania</h2>
        </div>
        <FaqList />
      </section>
    </main>

    <footer class="vd-foot">
      <p>{{ PRODUCT_NAME }}, {{ year }}</p>
    </footer>
  </div>
</template>

<style scoped>
.vd {
  --ground: var(--tint);
  --card: #fff;
  --radius: 1.25rem;
  --card-shadow: 0 1px 1px rgb(29 31 34 / 0.07), 0 14px 26px -12px rgb(29 31 34 / 0.22);
  --duty: var(--deep);
  --sign: var(--deep);
  --step-line: var(--deep);
  --step-fill: #fff;
  --display-stretch: 88%;
  --display-weight: 800;
  --pad: max(var(--gutter), calc((100vw - 80rem) / 2));
  background: var(--tint);
  transition: background-color 0.7s ease;
}

.vd ::selection {
  background: var(--deep);
  color: #fff;
}

.vd-defs {
  position: absolute;
  width: 0;
  height: 0;
}

.vd-top {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: var(--header-h);
  padding-inline: var(--pad);
  border-bottom: 1px solid var(--hairline);
  background: var(--tint);
  transition: background-color 0.7s ease;
}

.vd-top__mark {
  margin-right: auto;
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.015em;
  text-decoration: none;
  white-space: nowrap;
}

.vd-top__login {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 650;
  white-space: nowrap;
}

/* Wybór egzaminu: trzy stacje w jednym pasie, wybrana wypełnia się kolorem. */
.vd-pick {
  display: inline-flex;
  padding: 0.25rem;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: #fff;
}

.vd-pick__option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding-inline: 0.85rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.25s ease,
    color 0.25s ease;
}

.vd-pick__input {
  position: absolute;
  inset: 0;
  margin: 0;
  border-radius: inherit;
  opacity: 0;
  cursor: pointer;
}

.vd-pick__option:has(:checked) {
  --marker-fill: var(--exam);
  --marker-stroke: #fff;
  background: var(--ink);
  color: #fff;
}

.vd-pick__option:has(:focus-visible) {
  outline: 3px solid var(--ink);
  outline-offset: 3px;
}

.vd-pick--small {
  padding: 0.15rem;
  border-width: 1.5px;
}

.vd-pick--small .vd-pick__option {
  min-height: 2.4rem;
  padding-inline: 0.6rem;
  font-size: 0.9375rem;
}

.vd-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.vd-hero {
  display: grid;
  gap: 2rem;
  padding: clamp(1.75rem, 1rem + 3.5vw, 4rem) var(--pad) clamp(3rem, 2rem + 4vw, 5rem);
}

.vd-hero__body {
  display: grid;
  gap: 1.1rem;
  align-content: center;
  justify-items: start;
}

.vd-hero__title {
  font-size: clamp(3.3rem, 1.6rem + 8vw, 7rem);
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.035em;
  line-height: 0.9;
}

.vd-hero__lead {
  max-width: 40ch;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.4;
}

.vd-ask {
  display: grid;
  gap: 0.6rem;
  min-width: 0;
  margin: 0.4rem 0 0;
  padding: 0;
  border: 0;
}

/* W pasie pod pytaniem trzy stacje dzielą całą szerokość, żeby zmieścić się na telefonie. */
.vd-ask .vd-pick {
  display: flex;
  width: min(100%, 26rem);
}

.vd-ask .vd-pick__option {
  flex: 1 1 auto;
  justify-content: center;
  padding-inline: 0.5rem 0.65rem;
  font-size: clamp(0.9375rem, 0.8rem + 0.7vw, 1.0625rem);
}

.vd-ask__legend {
  margin-bottom: 0.6rem;
  padding: 0;
  font-size: clamp(1.35rem, 1.15rem + 0.9vw, 1.8rem);
  font-weight: 780;
  letter-spacing: -0.02em;
}

/* Drukarka: ciemna szczelina, z której wysuwa się bilet. */
.vd-printer {
  position: relative;
  width: 100%;
  max-width: 29rem;
  margin-inline: auto;
  padding-top: 0.6rem;
  perspective: 70rem;
}

.vd-printer__slot {
  position: absolute;
  top: 0;
  right: -0.9rem;
  left: -0.9rem;
  z-index: 2;
  height: 1.2rem;
  border-radius: 999px;
  background: var(--ink);
  box-shadow: 0 6px 10px -4px rgb(29 31 34 / 0.45);
}

.vd-ticket {
  --pad-t: clamp(1.1rem, 0.9rem + 1vw, 1.6rem);
  --notch: 0.75rem;
  --stub-h: calc(3rem + 2 * var(--pad-t));
  position: relative;
  isolation: isolate;
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.vd-ticket::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: 0 0 1.25rem 1.25rem;
  box-shadow:
    0 2px 2px rgb(29 31 34 / 0.1),
    0 22px 34px -12px rgb(29 31 34 / 0.3);
}

.vd-ticket__paper {
  position: relative;
  display: grid;
  border-radius: 0 0 1.25rem 1.25rem;
  background: #fff;
  overflow: hidden;
  mask:
    radial-gradient(
      circle var(--notch) at 0% calc(100% - var(--stub-h)),
      transparent calc(100% - 1px),
      #000 100%
    ),
    radial-gradient(
      circle var(--notch) at 100% calc(100% - var(--stub-h)),
      transparent calc(100% - 1px),
      #000 100%
    );
  mask-composite: intersect;
}

/* Giloszowe tło: cienkie fale w kolorze egzaminu, jak na papierze wartościowym. */
.vd-ticket__paper::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--exam);
  opacity: 0.16;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='14'%3E%3Cpath d='M0 7c8-9 16-9 24 0s16 9 24 0' fill='none' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E")
    0 0 / 48px 14px;
  transition: background-color 0.7s ease;
  pointer-events: none;
}

.vd-ticket__main {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.9rem 1rem;
  padding: var(--pad-t);
}

.vd-ticket__main > * {
  grid-column: 1 / -1;
}

.vd-ticket__micro {
  margin: calc(-0.35 * var(--pad-t)) calc(-1 * var(--pad-t)) 0;
  color: var(--deep);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
}

.vd-ticket__route {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.9375rem;
  font-weight: 700;
}

.vd-ticket__track {
  flex: 1;
  height: 0.5rem;
  margin-right: -1.3rem;
  border-radius: 0.25rem 0 0 0.25rem;
  background: var(--exam);
}

.vd-ticket__marker {
  position: relative;
  font-size: 1.6rem;
}

.vd-ticket__name {
  display: grid;
  grid-column: 1;
  align-self: center;
  font-size: clamp(2.1rem, 1.2rem + 4.6vw, 3.2rem);
  font-weight: 800;
  font-stretch: 75%;
  letter-spacing: 0.004em;
  line-height: 0.92;
  text-transform: uppercase;
}

/* Pieczęć: rozeta z elips, a w środku obracająca się bryła egzaminu. */
.vd-seal {
  position: relative;
  grid-column: 2;
  width: clamp(6.5rem, 30vw, 8.5rem);
  aspect-ratio: 1;
}

.vd-seal__rosette {
  position: absolute;
  inset: 0;
  fill: none;
  stroke: var(--exam);
  stroke-width: 0.55;
  opacity: 0.75;
}

.vd-seal__solid {
  position: absolute;
  inset: 21%;
  border-radius: 50%;
  background: #fff;
  color: var(--deep);
}

.vd-kind {
  display: flex;
  gap: 0.4rem;
}

.vd-kind__option {
  min-height: 2.75rem;
  padding: 0 0.95rem;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 650;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.vd-kind__option[aria-pressed='true'] {
  background: var(--ink);
  color: #fff;
}

.vd-fields {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem 1.5rem;
  align-items: end;
}

.vd-fields > div:first-child {
  grid-row: span 2;
}

.vd-fields dt {
  color: var(--ink-soft);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.vd-fields dd {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.vd-fields__price {
  font-size: clamp(2.6rem, 2rem + 3vw, 3.5rem);
  font-weight: 800;
  font-stretch: 82%;
  letter-spacing: -0.02em;
  line-height: 0.95;
}

/* Pasek hologramu. Kolory przesuwają się za myszą, a tam, gdzie przeglądarka to umie,
   także przy przewijaniu. */
.vd-ticket__foil {
  height: 1.5rem;
  margin-top: 0.2rem;
  border-radius: 0.3rem;
  background:
    repeating-linear-gradient(115deg, rgb(255 255 255 / 0.55) 0 2px, transparent 2px 7px),
    linear-gradient(100deg, #9fe8ff, #c9b6ff, #ffc2e6, #fff0a3, #a8ffd0, #9fe8ff, #c9b6ff, #ffc2e6)
      calc((var(--shine) + var(--lean, 0)) * 100%) 0 / 320% 100%;
}

.vd-ticket__stub {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: var(--stub-h);
  padding-inline: var(--pad-t);
  border-top: 2px dashed var(--hairline);
}

/* Kod kreskowy z samych pasków. */
.vd-ticket__code {
  width: 6.5rem;
  height: 2.4rem;
  background: repeating-linear-gradient(
    90deg,
    var(--ink) 0 2px,
    transparent 2px 5px,
    var(--ink) 5px 6px,
    transparent 6px 8px,
    var(--ink) 8px 11px,
    transparent 11px 13px
  );
}

.vd-print-enter-active {
  transition:
    clip-path 0.75s cubic-bezier(0.16, 1, 0.3, 1),
    translate 0.75s cubic-bezier(0.16, 1, 0.3, 1);
}

.vd-print-enter-from {
  clip-path: inset(0 -2rem 100% -2rem);
  translate: 0 -3rem;
}

.vd-print-enter-to {
  clip-path: inset(0 -2rem -4rem -2rem);
}

.vd-print-leave-active {
  transition:
    opacity 0.2s ease,
    translate 0.25s ease-in;
}

.vd-print-leave-to {
  opacity: 0;
  translate: 0 2rem;
}

.vd-section {
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 46rem;
  display: grid;
  gap: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
  padding: clamp(3.5rem, 2.5rem + 5vw, 7rem) var(--pad);
  border-top: 1px solid var(--hairline);
  scroll-margin-top: var(--header-h);
}

.vd-h2 {
  max-width: 16ch;
  font-size: clamp(2.2rem, 1.5rem + 3.6vw, 4.5rem);
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.03em;
  line-height: 0.98;
}

.vd-lead {
  max-width: 44ch;
  margin-top: 1.1rem;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.45;
}

.vd-control {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  gap: 2.25rem clamp(1.5rem, 3vw, 2.5rem);
  padding: 0;
  list-style: none;
}

.vd-check {
  display: grid;
  gap: 0.5rem;
  align-content: start;
  justify-items: start;
}

.vd-check__what {
  margin-top: 0.75rem;
  font-size: clamp(1.25rem, 1.1rem + 0.7vw, 1.6rem);
  font-weight: 780;
  letter-spacing: -0.015em;
}

.vd-check p {
  max-width: 34ch;
  color: #44484e;
}

/* Pieczątka: podwójna ramka i wersaliki, lekko krzywo, jak przybita ręką. */
.vd-stamp {
  --stamp: #2b3fa8;
  rotate: var(--turn);
  transition:
    opacity 0.12s ease var(--reveal-delay, 0ms),
    scale 0.35s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.vd-stamp--program {
  --stamp: #2c2f34;
}

.vd-stamp--duty {
  --stamp: #b3261b;
}

.vd-stamp.is-waiting {
  opacity: 0;
  scale: 1.6;
}

.vd-stamp__ink {
  display: block;
  padding: 0.5rem 0.9rem 0.55rem;
  border: 3px solid var(--stamp);
  border-radius: 0.5rem;
  outline: 1.5px solid var(--stamp);
  outline-offset: 3px;
  color: var(--stamp);
  font-size: 1.15rem;
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: 0.06em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
  filter: url('#vd-ink');
}

.vd-duo {
  align-items: start;
}

.vd-rise {
  transition:
    opacity 0.7s ease var(--reveal-delay, 0ms),
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.vd-rise.is-waiting {
  opacity: 0;
  translate: 0 1.75rem;
}

.vd-tickets {
  display: grid;
  gap: 1.25rem;
  padding: 0;
  list-style: none;
}

.vd-foot {
  padding: 1.75rem var(--pad) 2.25rem;
  border-top: 1px solid var(--hairline);
  font-size: 0.9375rem;
}

@media (max-width: 43.99rem) {
  .vd-pick--small .vd-pick__label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .vd-top__mark {
    font-size: 0.9375rem;
  }
}

@media (min-width: 60rem) {
  .vd-hero {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: center;
    min-height: calc(100svh - var(--header-h));
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .vd-duo {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    column-gap: clamp(1.5rem, 3vw, 2.5rem);
  }

  /* W wąskiej kolumnie zadanie próbne zostaje w jednym słupku. */
  .vd-duo__trial {
    grid-template-columns: none;
  }

  .vd-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .vd-split__head {
    position: sticky;
    top: calc(var(--header-h) + 2rem);
  }
}

@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .vd-ticket__foil {
      animation: vd-foil linear both;
      animation-timeline: scroll();
      animation-range: 0 60rem;
    }
  }
}

/* Zarejestrowana liczba, żeby dało się ją płynnie animować przewijaniem. */
@property --shine {
  syntax: '<number>';
  inherits: true;
  initial-value: 0.35;
}

@keyframes vd-foil {
  from {
    --shine: 0.05;
  }

  to {
    --shine: 0.95;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vd,
  .vd-top,
  .vd-ticket,
  .vd-print-enter-active,
  .vd-print-leave-active {
    transition: none;
  }
}
</style>
