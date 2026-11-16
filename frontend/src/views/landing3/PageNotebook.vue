<script setup lang="ts">
import '@fontsource/caveat/latin-ext-400.css'
import { useRouter } from 'vue-router'
import { EXAMS } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { AUDIENCE, daysToExam } from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import { usePageGround } from '@/landing2/pageGround'
import { vReveal } from '@/landing2/reveal'
import {
  CREW,
  CREW_TITLE,
  EXAM_TEXT,
  FAQ,
  LEAD,
  LEAD_TEXT,
  MAP_TEXT,
  MAP_TITLE,
  STEPS,
  STEPS_TEXT,
  TICKETS_TEXT,
} from '@/landing3/content'
import { plural } from '@/utils/plural'
import { formatPrice } from '@/utils/tickets'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import DutyChat from '@/components/landing2/DutyChat.vue'
import FounderSlot from '@/components/landing2/FounderSlot.vue'
import OpinionList from '@/components/landing2/OpinionList.vue'
import FaqList from '@/components/landing3/FaqList.vue'
import MapTeaser from '@/components/landing3/MapTeaser.vue'
import StepList from '@/components/landing3/StepList.vue'
import TicketPrinter from '@/components/landing3/TicketPrinter.vue'
import TrialTask from '@/components/landing3/TrialTask.vue'
import MapSketch from '@/components/map/MapSketch.vue'

// Strona jak zeszyt do matematyki: kratka, margines, tytuły podkreślone długopisem i rysunki
// wzorowane na arkuszach CKE.
const router = useRouter()
const { today, year } = useOffer()

usePageGround('#fbfaf4')

// Rysunki z mapy tematów, każdy w swoich wymiarach.
const SKETCHES = [
  { drawing: 'parabola', width: 60, height: 44 },
  { drawing: 'ostroslup', width: 54, height: 54 },
  { drawing: 'trojkat-prostokatny', width: 68, height: 52 },
]

function daysLeft(exam: (typeof EXAMS)[number]): string {
  const days = daysToExam(exam.id, today)
  return `${days} ${plural(days, ['dzień', 'dni', 'dni'])}`
}
</script>

<template>
  <div class="nb">
    <header class="nb-top">
      <a class="nb-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <nav class="nb-top__nav" aria-label="Sekcje">
        <a href="#zadanie">Zadanie</a>
        <a href="#mapa">Mapa</a>
        <a href="#bilety">Bilety</a>
      </nav>
      <RouterLink class="nb-top__login" :to="{ name: 'login' }">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="nb-hero" aria-labelledby="nb-title">
        <div class="nb-hero__body">
          <p class="nb-hand nb-hero__date">Temat lekcji:</p>
          <h1 id="nb-title" class="nb-hero__title">{{ PRODUCT_NAME }}</h1>
          <p class="nb-hero__audience">{{ AUDIENCE }}</p>
          <p class="nb-hero__lead">{{ LEAD }} {{ LEAD_TEXT }}</p>
          <div class="nb-actions">
            <RouterLink class="button nb-cta" :to="{ name: 'register' }">
              Załóż konto
              <ArrowIcon />
            </RouterLink>
            <a class="nb-link" href="#zadanie">
              Policz jedno zadanie
              <ArrowIcon down />
            </a>
          </div>
        </div>
        <div class="nb-hero__sketches" aria-hidden="true">
          <svg
            v-for="sketch in SKETCHES"
            :key="sketch.drawing"
            class="nb-sketch"
            :viewBox="`-4 -4 ${sketch.width + 8} ${sketch.height + 8}`"
          >
            <MapSketch :drawing="sketch.drawing" />
          </svg>
        </div>
      </section>

      <section class="nb-exams" aria-label="Egzaminy">
        <article
          v-for="exam in EXAMS"
          :key="exam.id"
          class="nb-exam"
          :style="{ '--exam': `var(--exam-${exam.id})` }"
        >
          <h2 class="nb-exam__name">{{ exam.name }}</h2>
          <p>{{ EXAM_TEXT[exam.id] }}</p>
          <p class="nb-exam__facts">
            <span class="nb-hand">do egzaminu {{ daysLeft(exam) }}</span>
            <a href="#bilety">Bilet od {{ formatPrice(exam.prices.monthly) }}</a>
          </p>
        </article>
      </section>

      <section id="zadanie" class="nb-section" aria-labelledby="nb-trial-title">
        <div class="nb-head">
          <h2 id="nb-trial-title" class="nb-h2">Zadanie 1.</h2>
          <p class="nb-lead">{{ STEPS_TEXT }}</p>
        </div>
        <TrialTask v-reveal class="nb-card" />
      </section>

      <section id="mapa" class="nb-section" aria-labelledby="nb-map-title">
        <div class="nb-head">
          <h2 id="nb-map-title" class="nb-h2">{{ MAP_TITLE }}</h2>
          <p class="nb-lead">{{ MAP_TEXT }}</p>
        </div>
        <MapTeaser v-reveal class="nb-map" />
      </section>

      <section class="nb-section nb-crew" aria-labelledby="nb-crew-title">
        <div class="nb-crew__main">
          <h2 id="nb-crew-title" class="nb-h2">{{ CREW_TITLE }}</h2>
          <ul class="nb-notes">
            <li v-for="role in CREW" :key="role.what" class="nb-note">
              <h3 class="nb-note__what">
                {{ role.what }}
                <span class="nb-hand">{{ role.label }}</span>
              </h3>
              <p>{{ role.text }}</p>
            </li>
          </ul>
        </div>
        <DutyChat v-reveal class="nb-card" />
      </section>

      <section class="nb-section nb-split" aria-labelledby="nb-steps-title">
        <div class="nb-head">
          <h2 id="nb-steps-title" class="nb-h2">Jak to działa</h2>
        </div>
        <StepList :steps="STEPS" />
      </section>

      <section class="nb-section" aria-labelledby="nb-voices-title">
        <h2 id="nb-voices-title" class="nb-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="nb-section" aria-labelledby="nb-founder-title">
        <h2 id="nb-founder-title" class="nb-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section
        id="bilety"
        class="nb-section nb-split nb-tickets"
        aria-labelledby="nb-tickets-title"
      >
        <div class="nb-head">
          <h2 id="nb-tickets-title" class="nb-h2">Bilety</h2>
          <p class="nb-lead">{{ TICKETS_TEXT }}</p>
        </div>
        <TicketPrinter @taken="router.push({ name: 'coming-soon' })" />
      </section>

      <section class="nb-section nb-split" aria-labelledby="nb-faq-title">
        <div class="nb-head">
          <h2 id="nb-faq-title" class="nb-h2">Pytania</h2>
        </div>
        <FaqList :items="FAQ" />
      </section>
    </main>

    <footer class="nb-foot">
      <p>{{ PRODUCT_NAME }}, {{ year }}</p>
      <RouterLink class="button nb-cta" :to="{ name: 'register' }">
        Załóż konto
        <ArrowIcon />
      </RouterLink>
    </footer>
  </div>
</template>

<style scoped>
.nb {
  /* Tyle miejsca u góry okna zajmuje stały nagłówek. */
  --fit-top: calc(var(--header-h) + 0.75rem);
  --ground: #fbfaf4;
  --surface: #fff;
  --card: #fff;
  --ink: #14213d;
  --ink-raised: #2a3a5e;
  --ink-soft: #4d5873;
  --hairline: rgb(20 33 61 / 0.16);
  --pen: #1f4fae;
  --red: #d42f23;
  --duty: var(--pen);
  --sign: var(--pen);
  --step-line: var(--pen);
  --step-fill: var(--ground);
  --radius: 0.5rem;
  --card-shadow: 0 1px 1px rgb(20 33 61 / 0.08), 0 12px 22px -14px rgb(20 33 61 / 0.3);
  --chat-task: #eef2fb;
  --chat-duty: #eef2fb;
  --display-stretch: 92%;
  --display-weight: 800;
  --sketch-color: var(--pen);
  --line-1: #c98500;
  --line-2: #1f4fae;
  --line-3: #168344;
  --line-4: #d42f23;
  --mm-fill: var(--ground);
  --square: 1.5rem;
  --pad: max(var(--gutter), calc((100vw - 70rem) / 2));
  /* Kratka zeszytu i czerwona linia marginesu. */
  background:
    linear-gradient(
      90deg,
      transparent calc(var(--pad) - 0.6rem),
      rgb(212 47 35 / 0.45) 0 calc(var(--pad) - 0.6rem + 1.5px),
      transparent 0
    ),
    linear-gradient(rgb(31 79 174 / 0.13) 1px, transparent 0) 0 0 / var(--square) var(--square),
    linear-gradient(90deg, rgb(31 79 174 / 0.13) 1px, transparent 0) 0 0 / var(--square)
      var(--square),
    var(--ground);
  color: var(--ink);
  overflow: clip;
}

.nb ::selection {
  background: var(--pen);
  color: #fff;
}

.nb :focus-visible {
  outline-color: var(--pen);
}

/* Dopiski odręczne, jak notatki ucznia na marginesie. */
.nb-hand {
  color: var(--pen);
  font-family: Caveat, cursive;
  font-size: 1.45rem;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1;
  text-transform: none;
}

.nb-top {
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

.nb-top__mark {
  margin-right: auto;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-decoration: none;
  white-space: nowrap;
}

.nb-top__nav {
  display: none;
  gap: 1.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
}

.nb-top__nav a,
.nb-top__login {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 650;
  white-space: nowrap;
}

.nb-top__nav a {
  color: var(--ink-soft);
  text-decoration: none;
}

.nb-cta {
  border-color: var(--pen);
  background: var(--pen);
  color: #fff;
}

.nb-cta:hover {
  border-color: #17408f;
  background: #17408f;
}

.nb-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  margin-top: 0.5rem;
}

.nb-link {
  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  min-height: 3rem;
  font-weight: 650;
}

.nb-hero {
  display: grid;
  /* Kolumna nie rozpycha się do szerokości tytułu, który w czcionce zastępczej jest szerszy. */
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
  padding: clamp(2rem, 1.5rem + 4vw, 5rem) var(--pad) clamp(2rem, 1.5rem + 3vw, 4rem);
}

.nb-hero__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.9rem;
  justify-items: start;
}

.nb-hero__date {
  font-size: 1.7rem;
}

/* Tytuł podkreślony dwa razy czerwonym długopisem, jak temat lekcji w zeszycie. */
.nb-hero__title {
  font-size: clamp(3rem, 1.6rem + 7.5vw, 5.75rem);
  font-weight: 830;
  font-stretch: 92%;
  letter-spacing: -0.04em;
  line-height: 0.98;
  text-decoration: underline double var(--red) 0.07em;
  text-underline-offset: 0.14em;
  /* Tytuł zostaje w jednym wierszu także w czcionce zastępczej, żeby strona nie skakała
     po wczytaniu właściwej. */
  white-space: nowrap;
}

.nb-hero__audience {
  max-width: 36ch;
  margin-top: 0.6rem;
  font-size: clamp(1.1rem, 1rem + 0.55vw, 1.4rem);
  font-weight: 700;
  line-height: 1.25;
}

.nb-hero__lead {
  max-width: 46ch;
  color: var(--ink-soft);
}

.nb-hero__sketches {
  display: flex;
  gap: 1rem;
  align-items: end;
  max-width: 26rem;
}

.nb-sketch {
  flex: 1 1 0;
  min-width: 0;
  overflow: visible;
}

.nb-sketch:nth-child(1) {
  rotate: -4deg;
}

.nb-sketch:nth-child(3) {
  rotate: 3deg;
}

/* Egzaminy jak trzy naklejki na okładkę zeszytu. */
.nb-exams {
  display: grid;
  gap: 0.9rem;
  padding: 0 var(--pad) clamp(2rem, 1.5rem + 3vw, 4rem);
}

.nb-exam {
  display: grid;
  gap: 0.5rem;
  align-content: start;
  padding: 1.1rem 1.2rem 0.9rem;
  border: 2px solid var(--exam);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

.nb-exam__name {
  color: color-mix(in srgb, var(--exam) 82%, #000);
  font-size: clamp(1.35rem, 1.2rem + 0.8vw, 1.75rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.nb-exam__facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  margin-top: auto;
}

.nb-exam__facts a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 700;
}

.nb-section {
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 40rem;
  display: grid;
  gap: clamp(1.5rem, 1.2rem + 1.6vw, 2.5rem);
  padding: clamp(2.5rem, 2rem + 3vw, 4.5rem) var(--pad);
  border-top: 1px solid var(--hairline);
  scroll-margin-top: var(--header-h);
}

.nb-head {
  display: grid;
  gap: 0.9rem;
  align-content: start;
}

.nb-h2 {
  justify-self: start;
  max-width: 20ch;
  font-size: clamp(1.9rem, 1.5rem + 2vw, 3rem);
  font-weight: 800;
  font-stretch: 92%;
  letter-spacing: -0.03em;
  line-height: 1.08;
  text-decoration: underline var(--red) 0.06em;
  text-underline-offset: 0.16em;
  text-wrap: balance;
}

.nb-lead {
  max-width: 46ch;
  color: var(--ink-soft);
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.nb-card {
  box-shadow: var(--card-shadow);
}

.nb-crew__main {
  display: grid;
  gap: clamp(1.25rem, 1rem + 1.2vw, 2rem);
}

.nb-notes {
  display: grid;
  gap: 1.25rem 2rem;
  padding: 0;
  list-style: none;
}

.nb-note__what {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.1rem 0.75rem;
  margin-bottom: 0.3rem;
  font-size: clamp(1.2rem, 1.1rem + 0.6vw, 1.45rem);
  font-weight: 780;
  letter-spacing: -0.015em;
}

.nb-note p {
  max-width: 44ch;
  color: var(--ink-soft);
}

/* Sekcja z kasownikiem nie może przycinać swojej zawartości, bo zabrany bilet opuszcza ją dołem. */
.nb-tickets {
  --tp-body: #14213d;
  --tk-button: var(--pen);
  content-visibility: visible;
  position: relative;
  z-index: 3;
}

.nb-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem var(--pad) 2.5rem;
  border-top: 1px solid var(--hairline);
  color: var(--ink-soft);
}

.nb :is(.nb-card, .nb-map) {
  transition:
    opacity 0.7s ease,
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.nb :is(.nb-card, .nb-map).is-waiting {
  opacity: 0;
  translate: 0 1.5rem;
}

@media (min-width: 44rem) {
  .nb-top__nav {
    display: flex;
  }

  .nb-exams {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .nb-notes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 60rem) {
  .nb-hero {
    grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
    align-items: end;
  }

  .nb-crew {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: start;
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .nb-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .nb-split > .nb-head {
    position: sticky;
    top: calc(var(--header-h) + 2rem);
  }
}
</style>
