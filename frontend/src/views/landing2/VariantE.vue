<script setup lang="ts">
import { EXAMS, type Exam } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import {
  AUDIENCE,
  CREW,
  CREW_INTRO,
  CREW_TITLE,
  LEAD_SHORT,
  MAP_ROUTES,
  WHO_LABELS,
  daysToExam,
  tidy,
} from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import { usePageGround } from '@/landing2/pageGround'
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

const { today, year, cheapest, annualMonths, validUntil } = useOffer()

usePageGround('#ffd026')

// Nazwa produktu jedzie jako pociąg: każde słowo to wagon.
const CARS = PRODUCT_NAME.split(' ')

const NEXT_STOPS = EXAMS.map((exam) => exam.name).join(' · ')

function meta(exam: Exam): string {
  const days = daysToExam(exam.id, today)
  return `Do egzaminu ${days} ${plural(days, ['dzień', 'dni', 'dni'])}, bilet od ${formatPrice(exam.prices.monthly)}`
}
</script>

<template>
  <div class="ve">
    <header class="ve-top">
      <a class="ve-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <nav class="ve-top__nav" aria-label="Sekcje">
        <a href="#egzaminy">Egzaminy</a>
        <a href="#ludzie">Kto to robi</a>
        <a href="#bilety">Bilety</a>
      </nav>
      <RouterLink class="ve-top__login" :to="{ name: 'login' }">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="ve-hero" aria-labelledby="ve-title">
        <div class="ve-track">
          <div class="ve-run">
            <h1 id="ve-title" class="ve-train" :aria-label="PRODUCT_NAME">
              <template v-for="(word, index) in CARS" :key="word">
                <span v-if="index" class="ve-train__link" aria-hidden="true" />
                <span class="ve-car" :style="{ '--order': index }" aria-hidden="true">
                  {{ word }}
                  <i class="ve-car__wheel" />
                  <i class="ve-car__wheel" />
                </span>
              </template>
            </h1>
          </div>
          <div class="ve-rail" aria-hidden="true" />
        </div>

        <div class="ve-hero__main">
          <div class="ve-hero__body">
            <p class="ve-hero__claim">{{ CREW_TITLE }}</p>
            <p class="ve-hero__lead">{{ AUDIENCE }} {{ LEAD_SHORT }}</p>
            <div class="ve-actions">
              <RouterLink class="button" :to="{ name: 'register' }">
                Załóż konto
                <ArrowIcon />
              </RouterLink>
              <a v-if="cheapest" class="button button--quiet" href="#bilety">
                Bilety już od {{ formatPrice(cheapest.price) }}
              </a>
            </div>
          </div>
          <div class="ve-discs" aria-hidden="true">
            <div
              v-for="(exam, index) in EXAMS"
              :key="exam.id"
              class="ve-disc"
              :style="{ '--exam': `var(--exam-${exam.id})`, '--order': index }"
            >
              <SolidFigure :kind="exam.solid" :fill="0.68" :weight="0.045" />
            </div>
          </div>
        </div>
        <div class="ve-edge" aria-hidden="true" />
      </section>

      <!-- Pasek biegnie w kółko, więc tekst jest w nim dwa razy; czytnik dostaje go raz. -->
      <p class="ve-next">
        <span v-for="copy in 2" :key="copy" class="ve-next__run" :aria-hidden="copy === 2">
          Następne stacje: {{ NEXT_STOPS }} ·&nbsp;
        </span>
      </p>

      <section id="egzaminy" class="ve-section ve-exams" aria-labelledby="ve-exams-title">
        <h2 id="ve-exams-title" class="ve-h2">Wybierz swoją stację</h2>
        <div class="ve-exams__list">
          <article
            v-for="exam in EXAMS"
            :id="exam.id"
            :key="exam.id"
            class="ve-exam"
            :style="{ '--field': `var(--field-${exam.id})` }"
          >
            <div v-reveal class="ve-exam__disc" aria-hidden="true">
              <SolidFigure :kind="exam.solid" :fill="0.64" :weight="0.03" />
            </div>
            <div class="ve-exam__body">
              <h3 class="ve-exam__name">{{ exam.name }}</h3>
              <p class="ve-exam__text">{{ tidy(exam.description) }}</p>
              <p class="ve-exam__meta">{{ meta(exam) }}</p>
              <div class="ve-actions">
                <RouterLink
                  v-if="MAP_ROUTES[exam.id]"
                  class="button"
                  :to="{ name: MAP_ROUTES[exam.id] }"
                >
                  Mapa tematów
                  <ArrowIcon />
                </RouterLink>
                <a class="button button--quiet" href="#bilety">Kup bilet</a>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="ludzie" class="ve-section ve-dark ve-crew" aria-labelledby="ve-crew-title">
        <div class="ve-crew__head">
          <h2 id="ve-crew-title" class="ve-h2 ve-crew__title">{{ CREW_TITLE }}</h2>
          <p class="ve-lead">{{ CREW_INTRO }}</p>
        </div>
        <ul class="ve-crew__list">
          <li
            v-for="(role, index) in CREW"
            :key="role.what"
            v-reveal="index * 70"
            class="ve-role"
            :class="`ve-role--${role.who}`"
          >
            <span class="ve-role__icon"><WhoIcon :who="role.who" /></span>
            <div>
              <h3 class="ve-role__what">
                {{ role.what }}
                <span class="ve-role__who">{{ WHO_LABELS[role.who] }}</span>
              </h3>
              <p>{{ role.text }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section class="ve-section ve-yellow ve-duo" aria-label="Dyżurny i zadanie na próbę">
        <DutyChat v-reveal class="ve-rise" />
        <TrialTask v-reveal="120" class="ve-rise ve-duo__trial" />
      </section>

      <section id="jak-to-dziala" class="ve-section ve-split" aria-labelledby="ve-steps-title">
        <div class="ve-split__head">
          <h2 id="ve-steps-title" class="ve-h2">Jak to działa</h2>
          <p class="ve-lead">
            {{
              tidy(
                'Zadania rozwiązujesz w zeszycie, tak jak na egzaminie, a aplikacja prowadzi cię od tematu do tematu.',
              )
            }}
          </p>
        </div>
        <StepList />
      </section>

      <section class="ve-section ve-grey" aria-labelledby="ve-voices-title">
        <h2 id="ve-voices-title" class="ve-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="ve-section" aria-labelledby="ve-founder-title">
        <h2 id="ve-founder-title" class="ve-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section id="bilety" class="ve-section ve-grey ve-split" aria-labelledby="ve-tickets-title">
        <div class="ve-split__head">
          <h2 id="ve-tickets-title" class="ve-h2">Bilety</h2>
          <p class="ve-lead">
            {{
              tidy(
                'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
              )
            }}
          </p>
        </div>
        <ol class="ve-tickets">
          <li v-for="(exam, index) in EXAMS" :key="exam.id">
            <TicketCard
              :exam="exam"
              :valid-until="validUntil"
              :annual-months="annualMonths"
              :order="index"
            />
          </li>
        </ol>
      </section>

      <section class="ve-section ve-split" aria-labelledby="ve-faq-title">
        <div class="ve-split__head">
          <h2 id="ve-faq-title" class="ve-h2">Pytania</h2>
        </div>
        <FaqList />
      </section>
    </main>

    <footer class="ve-foot ve-yellow">
      <div class="ve-edge ve-edge--top" aria-hidden="true" />
      <div class="ve-foot__body">
        <p class="ve-h2">Odjazd?</p>
        <RouterLink class="button" :to="{ name: 'register' }">
          Załóż konto
          <ArrowIcon />
        </RouterLink>
        <p class="ve-foot__year">{{ PRODUCT_NAME }}, {{ year }}</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.ve {
  --yellow: #ffd026;
  --ink: #17181a;
  --ink-raised: #303237;
  --ink-soft: #4a4d53;
  --ground: #fff;
  --surface: #fff;
  --card: #fff;
  --duty: #b4510a;
  --radius: 1.5rem;
  --card-shadow: 0 1px 1px rgb(23 24 26 / 0.08), 0 14px 26px -12px rgb(23 24 26 / 0.25);
  --display-stretch: 112%;
  --display-weight: 880;
  --pad: max(var(--gutter), calc((100vw - 80rem) / 2));

  /* Pola pod bryły: te same kolory egzaminów, przyciemnione tak, żeby biała linia była czytelna. */
  --field-e8: #2a66d6;
  --field-matura-podstawowa: #168344;
  --field-matura-rozszerzona: #d42f23;

  background: #fff;
  color: var(--ink);
}

.ve ::selection {
  background: var(--ink);
  color: var(--yellow);
}

.ve-yellow {
  --ground: var(--yellow);
  --chat-task: #f3f3f1;
  --chat-duty: #f3f3f1;
  background: var(--yellow);
}

.ve-yellow :deep(.chat),
.ve-yellow :deep(.trial) {
  --ground: #f3f3f1;
}

.ve-dark {
  --ground: #17181a;
  --ink: #fff;
  --ink-raised: #e9e9e6;
  --ink-soft: #c6c8cc;
  --hairline: rgb(255 255 255 / 0.2);
  background: #17181a;
  color: #fff;
}

.ve-dark ::selection {
  background: var(--yellow);
  color: #17181a;
}

.ve-grey {
  --ground: #f1f1ee;
  background: #f1f1ee;
}

.ve-top {
  --ground: var(--yellow);
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: var(--header-h);
  padding-inline: var(--pad);
  border-bottom: 2px solid var(--ink);
  background: var(--yellow);
}

.ve-top__mark {
  margin-right: auto;
  font-weight: 880;
  font-stretch: 112%;
  letter-spacing: -0.03em;
  text-decoration: none;
  white-space: nowrap;
}

.ve-top__nav {
  display: none;
  gap: 1.5rem;
  font-size: 0.9375rem;
  font-weight: 650;
}

.ve-top__nav a {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  text-decoration: none;
}

.ve-top__nav a:hover {
  text-decoration: underline;
  text-decoration-thickness: 2px;
}

.ve-top__login {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.ve-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.ve-hero {
  --ground: var(--yellow);
  display: grid;
  gap: clamp(1.5rem, 1rem + 2.5vw, 3rem);
  padding-top: clamp(1.75rem, 1rem + 3.5vw, 4rem);
  background: var(--yellow);
  overflow: clip;
}

/* Pociąg z nazwy: wagony z grubym konturem na szynie przez całą szerokość. */
.ve-train {
  display: flex;
  align-items: flex-end;
  width: max-content;
  margin-inline: var(--pad);
  font-size: min(9.6vw, 7.75rem);
  font-weight: 900;
  font-stretch: 100%;
  letter-spacing: -0.035em;
  line-height: 1;
}

.ve-car {
  position: relative;
  padding: 0.14em 0.3em 0.2em;
  border: 0.075em solid var(--ink);
  border-radius: 0.26em;
  background: #fff;
}

/* Pierwszy wagon ma zaokrąglony przód i reflektor. */
.ve-car:first-child {
  border-top-left-radius: 0.62em;
}

.ve-car:first-child::before {
  content: '';
  position: absolute;
  bottom: 0.12em;
  left: 0.1em;
  width: 0.13em;
  height: 0.13em;
  border: 0.04em solid var(--ink);
  border-radius: 50%;
  background: var(--yellow);
}

.ve-car__wheel {
  position: absolute;
  bottom: -0.19em;
  left: 16%;
  width: 0.24em;
  height: 0.24em;
  border: 0.05em solid var(--ink);
  border-radius: 50%;
  background: conic-gradient(var(--ink) 0 25%, #fff 0 50%, var(--ink) 0 75%, #fff 0);
}

.ve-car__wheel + .ve-car__wheel {
  right: 16%;
  left: auto;
}

.ve-train__link {
  align-self: center;
  width: 0.2em;
  height: 0.075em;
  margin-top: 0.3em;
  background: var(--ink);
}

.ve-rail {
  height: 0.5rem;
  /* Szyna leży tuż pod kołami, których rozmiar zależy od wielkości napisu. */
  margin-top: calc(min(9.6vw, 7.75rem) * 0.17);
  background: var(--ink);
}

.ve-hero__main {
  display: grid;
  gap: 1.75rem;
  padding-inline: var(--pad);
}

.ve-hero__body {
  display: grid;
  gap: 1rem;
}

.ve-hero__claim {
  max-width: 14ch;
  font-size: clamp(2rem, 1.3rem + 3.4vw, 4rem);
  font-weight: 880;
  font-stretch: 112%;
  letter-spacing: -0.04em;
  line-height: 0.98;
  text-wrap: balance;
}

.ve-hero__lead {
  max-width: 46ch;
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.ve-hero .ve-actions {
  margin-top: 0.4rem;
}

/* Trzy krążki z bryłami, jak znaki linii na schemacie. */
.ve-discs {
  display: flex;
  justify-content: center;
}

.ve-disc {
  flex: none;
  width: min(29vw, 12rem);
  aspect-ratio: 1;
  margin-inline: -0.5rem;
  border: 0.3rem solid var(--ink);
  border-radius: 50%;
  background: #fff;
  color: var(--exam);
}

.ve-disc:nth-child(2) {
  margin-top: 1.5rem;
}

/* Krawędź peronu: pas z wypustkami i biała linia bezpieczeństwa. */
.ve-edge {
  height: 3.4rem;
  border-top: 0.45rem solid #fff;
  background:
    radial-gradient(circle, rgb(23 24 26 / 0.2) 27%, transparent 30%) 0 0.15rem / 1.05rem 1.05rem,
    #f2bd00;
}

.ve-edge--top {
  border-top: 0;
  border-bottom: 0.45rem solid #fff;
}

.ve-next {
  display: flex;
  padding-block: 0.8rem;
  background: var(--ink);
  color: var(--yellow);
  font-size: clamp(1rem, 0.9rem + 0.5vw, 1.3rem);
  font-weight: 800;
  font-stretch: 112%;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
}

.ve-next__run {
  flex: none;
}

.ve-section {
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 46rem;
  display: grid;
  gap: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
  padding: clamp(3.5rem, 2.5rem + 5vw, 7rem) var(--pad);
  scroll-margin-top: var(--header-h);
}

.ve-h2 {
  max-width: 15ch;
  font-size: clamp(2.1rem, 1.4rem + 3.5vw, 4.4rem);
  font-weight: 880;
  font-stretch: 112%;
  letter-spacing: -0.04em;
  line-height: 0.96;
}

.ve-lead {
  max-width: 44ch;
  margin-top: 1.1rem;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.45;
}

.ve-exams__list {
  display: grid;
  gap: clamp(2.25rem, 1.5rem + 3vw, 4rem);
}

.ve-exam {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 0.75rem 1rem;
  align-items: center;
  scroll-margin-top: calc(var(--header-h) + 1rem);
}

.ve-exam__disc {
  --solid-back: 0.5;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--field);
  color: #fff;
  transition:
    scale 0.7s cubic-bezier(0.16, 1, 0.3, 1),
    rotate 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.ve-exam__disc.is-waiting {
  scale: 0.5;
  rotate: -40deg;
}

.ve-exam__body {
  display: contents;
}

.ve-exam__body > :not(.ve-exam__name) {
  grid-column: 1 / -1;
}

.ve-exam__name {
  font-size: clamp(1.7rem, 1.2rem + 2.4vw, 3.1rem);
  font-weight: 880;
  font-stretch: 112%;
  letter-spacing: -0.04em;
  line-height: 0.98;
}

.ve-exam__text {
  max-width: 46ch;
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
}

.ve-exam__meta {
  color: var(--ink-soft);
  font-size: 0.9375rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.ve-crew__title {
  color: var(--yellow);
}

.ve-crew__list {
  display: grid;
  padding: 0;
  border-bottom: 1px solid var(--hairline);
  list-style: none;
}

.ve-role {
  display: flex;
  gap: 1rem;
  padding-block: 1.15rem;
  border-top: 1px solid var(--hairline);
  transition:
    opacity 0.6s ease var(--reveal-delay, 0ms),
    translate 0.8s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.ve-role.is-waiting {
  opacity: 0;
  translate: 0 1.5rem;
}

.ve-role__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.9rem;
  height: 2.9rem;
  border-radius: 50%;
  background: #fff;
  color: #17181a;
  font-size: 1.4rem;
}

.ve-role--duty .ve-role__icon {
  background: var(--yellow);
}

.ve-role__what {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.75rem;
  margin-bottom: 0.3rem;
  font-size: clamp(1.3rem, 1.1rem + 0.9vw, 1.8rem);
  font-weight: 850;
  font-stretch: 112%;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.ve-role__who {
  font-size: 0.9375rem;
  font-weight: 700;
  font-stretch: 100%;
  letter-spacing: 0;
}

.ve-role--duty .ve-role__who {
  color: var(--yellow);
}

.ve-role p {
  max-width: 48ch;
  color: var(--ink-soft);
}

.ve-duo {
  align-items: start;
}

.ve-rise {
  transition:
    opacity 0.7s ease var(--reveal-delay, 0ms),
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.ve-rise.is-waiting {
  opacity: 0;
  translate: 0 1.75rem;
}

.ve-tickets {
  display: grid;
  gap: 1.25rem;
  padding: 0;
  list-style: none;
}

.ve-foot__body {
  display: grid;
  gap: 1.25rem;
  justify-items: start;
  padding: clamp(2.5rem, 2rem + 4vw, 5rem) var(--pad) 2rem;
}

.ve-foot__year {
  margin-top: 1.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
}

@media (min-width: 44rem) {
  .ve-top__nav {
    display: flex;
  }

  .ve-top__login {
    margin-left: 0.5rem;
  }

  .ve-exam {
    grid-template-columns: clamp(9rem, 20vw, 15rem) minmax(0, 1fr);
    gap: 1rem clamp(1.5rem, 4vw, 3.5rem);
  }

  .ve-exam__body {
    display: grid;
    gap: 0.7rem;
  }
}

@media (min-width: 60rem) {
  .ve-hero__main {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: center;
    padding-bottom: 1rem;
  }

  .ve-disc {
    width: clamp(9rem, 15vw, 14rem);
  }

  .ve-crew {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .ve-crew__head {
    position: sticky;
    top: calc(var(--header-h) + 2rem);
  }

  .ve-duo {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    column-gap: clamp(1.5rem, 3vw, 2.5rem);
  }

  .ve-duo__trial {
    grid-template-columns: none;
  }

  .ve-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .ve-split__head {
    position: sticky;
    top: calc(var(--header-h) + 2rem);
  }
}

@media (prefers-reduced-motion: no-preference) {
  /* Pociąg wjeżdża z prawej i hamuje, a wagony dobijają do siebie po kolei. */
  .ve-train {
    animation: ve-arrive 1.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .ve-car {
    animation: ve-settle 0.55s cubic-bezier(0.16, 1, 0.3, 1) calc(1.15s + var(--order) * 0.12s) both;
  }

  .ve-car__wheel {
    animation: ve-roll 1.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .ve-disc {
    animation: ve-float 5s ease-in-out calc(var(--order) * -1.7s) infinite;
  }

  .ve-next__run {
    animation: ve-run 26s linear infinite;
  }
}

/* Przy przewijaniu pociąg odjeżdża w lewo. Działa tam, gdzie przeglądarka wiąże animację
   z przewijaniem; gdzie indziej pociąg po prostu stoi. */
@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .ve-run {
      animation: ve-leave linear both;
      animation-timeline: scroll();
      animation-range: 0 90svh;
    }
  }
}

@keyframes ve-arrive {
  from {
    translate: 105vw 0;
  }
}

@keyframes ve-settle {
  from {
    translate: calc(var(--order) * 0.16em) 0;
  }
}

@keyframes ve-roll {
  from {
    rotate: 900deg;
  }
}

@keyframes ve-float {
  50% {
    translate: 0 -0.5rem;
  }
}

@keyframes ve-run {
  to {
    translate: -100% 0;
  }
}

@keyframes ve-leave {
  to {
    translate: -45vw 0;
  }
}
</style>
