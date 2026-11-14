<script setup lang="ts">
import { EXAMS } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import {
  AUDIENCE,
  CREW,
  CREW_INTRO,
  CREW_TITLE,
  LEAD,
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
import StationMarker from '@/components/landing/StationMarker.vue'
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

usePageGround('#16224f')

function daysLeft(exam: (typeof EXAMS)[number]): string {
  const days = daysToExam(exam.id, today)
  return `${days} ${plural(days, ['dzień', 'dni', 'dni'])}`
}
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
        <a class="va-top__stop" href="#bilety">
          <StationMarker shape="ticket" />
          <span class="va-top__label">Bilety</span>
        </a>
      </nav>
      <RouterLink class="va-top__login" :to="{ name: 'login' }">Zaloguj się</RouterLink>
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
            <a v-if="cheapest" class="va-more" href="#bilety">
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
              <RouterLink
                v-if="MAP_ROUTES[exam.id]"
                class="button"
                :to="{ name: MAP_ROUTES[exam.id] }"
              >
                Mapa tematów
                <ArrowIcon />
              </RouterLink>
              <a class="button button--quiet" href="#bilety">
                Bilet od {{ formatPrice(exam.prices.monthly) }}
              </a>
            </div>
          </div>
        </section>
      </div>

      <section id="ludzie" class="va-section va-crew" aria-labelledby="va-crew-title">
        <div class="va-crew__head">
          <h2 id="va-crew-title" class="va-h2">{{ CREW_TITLE }}</h2>
          <p class="va-lead">{{ CREW_INTRO }}</p>
        </div>
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
                <span class="va-role__who">{{ WHO_LABELS[role.who] }}</span>
              </h3>
              <p>{{ role.text }}</p>
            </div>
          </li>
        </ul>
        <div v-reveal class="va-crew__chat">
          <DutyChat />
        </div>
      </section>

      <section class="va-section va-trial va-field" aria-label="Zadanie na próbę">
        <TrialTask v-reveal />
      </section>

      <section id="jak-to-dziala" class="va-section va-split" aria-labelledby="va-steps-title">
        <div class="va-split__head">
          <h2 id="va-steps-title" class="va-h2">Jak to działa</h2>
          <p class="va-lead">
            {{
              tidy(
                'Zadania rozwiązujesz w zeszycie, tak jak na egzaminie, a aplikacja prowadzi cię od tematu do tematu.',
              )
            }}
          </p>
        </div>
        <StepList />
      </section>

      <section class="va-section va-voices" aria-labelledby="va-voices-title">
        <h2 id="va-voices-title" class="va-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="va-section va-founder" aria-labelledby="va-founder-title">
        <h2 id="va-founder-title" class="va-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section id="bilety" class="va-section va-split" aria-labelledby="va-tickets-title">
        <div class="va-split__head">
          <h2 id="va-tickets-title" class="va-h2">Bilety</h2>
          <p class="va-lead">
            {{
              tidy(
                'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
              )
            }}
          </p>
        </div>
        <ol class="va-tickets">
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

      <section class="va-section va-split" aria-labelledby="va-faq-title">
        <div class="va-split__head">
          <h2 id="va-faq-title" class="va-h2">Pytania</h2>
        </div>
        <FaqList />
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
  --pad: max(var(--gutter), calc((100vw - 84rem) / 2));
  background: var(--ground);
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
  contain-intrinsic-size: auto 46rem;
  position: relative;
  z-index: 1;
  display: grid;
  gap: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
  padding: clamp(4rem, 2.5rem + 6vw, 7.5rem) var(--pad);
  background: var(--ground);
  scroll-margin-top: 3.5rem;
}

.va-h2 {
  max-width: 16ch;
  font-size: clamp(2.2rem, 1.5rem + 3.6vw, 4.5rem);
  font-weight: 800;
  font-stretch: 88%;
  letter-spacing: -0.028em;
  line-height: 0.98;
}

.va-lead {
  max-width: 44ch;
  margin-top: 1.1rem;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.45;
}

.va-crew__list {
  display: grid;
  gap: 0.35rem;
  padding: 0;
  list-style: none;
}

.va-role {
  display: flex;
  gap: 1rem;
  padding-block: 1.1rem;
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

.va-role--program .va-role__icon {
  background: var(--ink);
}

.va-role--duty .va-role__icon {
  background: var(--duty);
}

.va-role__what {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.75rem;
  margin-bottom: 0.3rem;
  font-size: clamp(1.25rem, 1.1rem + 0.7vw, 1.6rem);
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

.va-role--program .va-role__who {
  color: var(--ink-soft);
}

.va-role--duty .va-role__who {
  color: var(--duty);
}

.va-role__body p {
  max-width: 46ch;
  color: var(--ink-soft);
}

.va-trial {
  --field: var(--navy);
  /* Karta zadania zostaje jasna na granatowym polu. */
  --card: #fff;
}

.va-trial :deep(.trial) {
  --ink: #1d1f22;
  --ink-raised: #36393e;
  --ink-soft: #55595f;
  --ground: #fff;
}

.va-voices {
  --card: #fff;
  background: #e6e9f2;
}

.va-founder {
  --sign: var(--navy);
}

.va-tickets {
  display: grid;
  gap: 1.25rem;
  padding: 0;
  list-style: none;
}

.va-foot {
  content-visibility: auto;
  contain-intrinsic-size: auto 46rem;
  --field: var(--navy);
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1.5rem;
  padding: clamp(3rem, 2rem + 5vw, 6rem) var(--pad) 2rem;
}

.va-foot__mark {
  font-size: clamp(3.5rem, 19vw, 13rem);
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

  .va-crew__head {
    grid-column: 1 / -1;
  }

  .va-crew__chat {
    position: sticky;
    top: 5rem;
  }

  .va-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .va-split__head {
    position: sticky;
    top: 5.5rem;
  }
}
</style>
