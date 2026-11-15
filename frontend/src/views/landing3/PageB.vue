<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EXAMS, type Exam } from '@/config/exams'
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
import SolidFigure from '@/components/landing2/SolidFigure.vue'
import FaqList from '@/components/landing3/FaqList.vue'
import FlapText from '@/components/landing3/FlapText.vue'
import MapTeaser from '@/components/landing3/MapTeaser.vue'
import StepList from '@/components/landing3/StepList.vue'
import TicketPrinter from '@/components/landing3/TicketPrinter.vue'
import TrialTask from '@/components/landing3/TrialTask.vue'
import WhoIcon from '@/components/landing3/WhoIcon.vue'

// Po przewinięciu o tyle pikseli tablica przełącza się z dni do egzaminu na ceny biletów.
const PRICE_AFTER = 140

const router = useRouter()
const { today, year, cheapest } = useOffer()

usePageGround('#f3efe6')

// Na tablicy egzamin ósmoklasisty ma krótszą nazwę, żeby wszystkie mieściły się w 18 polach.
const BOARD_NAMES: Record<Exam['id'], string> = {
  e8: 'Ósmoklasisty',
  'matura-podstawowa': 'Matura podstawowa',
  'matura-rozszerzona': 'Matura rozszerzona',
}

function days(exam: Exam): number {
  return daysToExam(exam.id, today)
}

function daysWord(exam: Exam): string {
  return plural(days(exam), ['dzień', 'dni', 'dni'])
}

// Przy otwarciu strony tablica stoi. Klapki ruszają dopiero razem z przewijaniem.
const showPrice = ref(false)
const clock = ref('')
let clockTimer = 0

function info(exam: Exam): string {
  return showPrice.value
    ? `od ${exam.prices.monthly} zł mies.`
    : `za ${days(exam)} ${daysWord(exam)}`
}

function readClock() {
  clock.value = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(),
  )
}

function onScroll() {
  const past = window.scrollY > PRICE_AFTER
  if (past !== showPrice.value) showPrice.value = past
}

onMounted(() => {
  readClock()
  clockTimer = window.setInterval(readClock, 20_000)
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.clearInterval(clockTimer)
  window.removeEventListener('scroll', onScroll)
})

const NOTICE = 'Typy zadań z egzaminu · nowe liczby w każdej powtórce'
</script>

<template>
  <div class="vb">
    <header class="vb-top">
      <a class="vb-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <nav class="vb-top__nav" aria-label="Sekcje">
        <a href="#mapa">Mapa tematów</a>
        <a href="#jak-to-dziala">Jak to działa</a>
        <a href="#bilety">Bilety</a>
      </nav>
      <RouterLink class="vb-top__login" to="/wizytowka3/b/logowanie">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="vb-hero" aria-labelledby="vb-title">
        <div class="vb-board">
          <div class="vb-board__head">
            <span class="vb-board__label">Odjazdy</span>
            <span class="vb-board__clock" aria-hidden="true">{{ clock }}</span>
          </div>
          <ul class="vb-board__rows">
            <li v-for="(exam, index) in EXAMS" :key="exam.id">
              <a
                class="vb-row"
                :href="`#${exam.id}`"
                :style="{ '--exam': `var(--board-${exam.id})` }"
              >
                <span class="vb-row__solid" aria-hidden="true">
                  <SolidFigure
                    :kind="exam.solid"
                    :drag="false"
                    :fill="0.94"
                    :weight="0.085"
                    :spin="0"
                  />
                </span>
                <FlapText class="vb-row__name" :text="BOARD_NAMES[exam.id]" :cells="18" settled />
                <FlapText
                  class="vb-row__info"
                  :text="info(exam)"
                  :cells="14"
                  :delay="index * 220"
                  settled
                />
              </a>
            </li>
          </ul>
          <p class="vb-board__notice">{{ NOTICE }}</p>
        </div>

        <div class="vb-hero__body">
          <h1 id="vb-title" class="vb-hero__title">{{ PRODUCT_NAME }}</h1>
          <div class="vb-hero__text">
            <p class="vb-hero__audience">{{ AUDIENCE }}</p>
            <div class="vb-actions">
              <RouterLink class="button vb-cta" :to="{ name: 'register' }">
                Załóż konto
                <ArrowIcon />
              </RouterLink>
              <a v-if="cheapest" class="button button--quiet" href="#bilety">
                Bilety już od {{ formatPrice(cheapest.price) }}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="vb-platforms" aria-label="Egzaminy">
        <article
          v-for="exam in EXAMS"
          :id="exam.id"
          :key="exam.id"
          class="vb-platform"
          :style="{ '--exam': `var(--exam-${exam.id})`, '--sign': `var(--sign-${exam.id})` }"
        >
          <h2 v-reveal class="vb-sign">{{ exam.name }}</h2>
          <div class="vb-platform__figure" aria-hidden="true">
            <SolidFigure :kind="exam.solid" :spin="0.05" :fill="0.82" :weight="0.03" />
          </div>
          <p class="vb-platform__text">{{ EXAM_TEXT[exam.id] }}</p>
          <dl class="vb-facts">
            <div>
              <dt>Do egzaminu</dt>
              <dd>{{ days(exam) }} {{ daysWord(exam) }}</dd>
            </div>
            <div>
              <dt>Bilet miesięczny</dt>
              <dd>{{ formatPrice(exam.prices.monthly) }}</dd>
            </div>
            <div>
              <dt>Bilet roczny</dt>
              <dd>{{ formatPrice(exam.prices.annual) }}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section id="mapa" class="vb-section vb-map" aria-labelledby="vb-map-title">
        <div class="vb-map__head">
          <h2 id="vb-map-title" class="vb-h2">{{ MAP_TITLE }}</h2>
          <div>
            <p class="vb-lead">{{ MAP_TEXT }}</p>
            <RouterLink class="vb-link" to="/wizytowka3/b/mapa">
              Zobacz całą mapę w aplikacji
              <ArrowIcon />
            </RouterLink>
          </div>
        </div>
        <div v-reveal class="vb-map__plate">
          <MapTeaser />
        </div>
      </section>

      <section id="ludzie" class="vb-section vb-crew" aria-labelledby="vb-crew-title">
        <div class="vb-crew__main">
          <h2 id="vb-crew-title" class="vb-h2">{{ CREW_TITLE }}</h2>
          <ul class="vb-roster">
            <li
              v-for="(role, index) in CREW"
              :key="role.what"
              v-reveal="index * 80"
              class="vb-post"
              :class="`vb-post--${role.who}`"
            >
              <h3 class="vb-post__what">{{ role.what }}</h3>
              <p class="vb-post__who">
                <WhoIcon :who="role.who" />
                {{ role.label }}
              </p>
              <p class="vb-post__text">{{ role.text }}</p>
            </li>
          </ul>
        </div>
        <div v-reveal class="vb-crew__chat">
          <DutyChat />
        </div>
      </section>

      <section class="vb-section vb-try" aria-label="Zadanie na próbę">
        <TrialTask v-reveal class="vb-trial" />
        <RouterLink class="vb-link" to="/wizytowka3/b/zadanie">
          Zobacz ekran zadania w aplikacji
          <ArrowIcon />
        </RouterLink>
      </section>

      <section id="jak-to-dziala" class="vb-section vb-split" aria-labelledby="vb-steps-title">
        <div class="vb-split__head">
          <h2 id="vb-steps-title" class="vb-h2">Jak to działa</h2>
          <p class="vb-lead">{{ STEPS_TEXT }}</p>
        </div>
        <StepList :steps="STEPS" />
      </section>

      <section class="vb-section" aria-labelledby="vb-voices-title">
        <h2 id="vb-voices-title" class="vb-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="vb-section" aria-labelledby="vb-founder-title">
        <h2 id="vb-founder-title" class="vb-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section
        id="bilety"
        class="vb-section vb-split vb-tickets"
        aria-labelledby="vb-tickets-title"
      >
        <div class="vb-split__head">
          <h2 id="vb-tickets-title" class="vb-h2">Bilety</h2>
          <p class="vb-lead">{{ TICKETS_TEXT }}</p>
        </div>
        <TicketPrinter @taken="router.push({ name: 'coming-soon' })" />
      </section>

      <section class="vb-section vb-split" aria-labelledby="vb-faq-title">
        <div class="vb-split__head">
          <h2 id="vb-faq-title" class="vb-h2">Pytania</h2>
        </div>
        <FaqList :items="FAQ" />
      </section>
    </main>

    <footer class="vb-foot">
      <p>{{ PRODUCT_NAME }}, {{ year }}</p>
      <RouterLink class="button vb-cta" :to="{ name: 'register' }">
        Załóż konto
        <ArrowIcon />
      </RouterLink>
    </footer>
  </div>
</template>

<style scoped>
/* Jasna hala dworca: ciepły papier i grafitowy tekst. Ciemna zostaje tylko sama tablica. */
.vb {
  --ground: #f3efe6;
  --surface: #fffdf8;
  --card: #fffdf8;
  --ink: #1c1a17;
  --ink-raised: #34312b;
  --ink-soft: #5d584e;
  --hairline: rgb(28 26 23 / 0.15);
  --danger: #b42318;
  --correct: #157a3a;
  --amber: #ffb224;
  --amber-deep: #8a5200;
  --duty: var(--amber-deep);
  --radius: 1rem;
  --card-shadow: 0 1px 1px rgb(28 26 23 / 0.06), 0 14px 26px -14px rgb(28 26 23 / 0.28);
  --chat-task: #ebe5d8;
  --chat-duty: #ebe5d8;
  --step-fill: var(--ground);
  --step-line: var(--ink);
  --sign: var(--ink);
  --display-stretch: 82%;
  --display-weight: 780;
  --pad: max(var(--gutter), calc((100vw - 78rem) / 2));

  --sign-e8: #2a66d6;
  --sign-matura-podstawowa: #168344;
  --sign-matura-rozszerzona: #d42f23;
  /* Na ciemnej płycie tablicy linie brył potrzebują jaśniejszych odcieni tych samych kolorów. */
  --board-e8: #6aa0ff;
  --board-matura-podstawowa: #3fcf80;
  --board-matura-rozszerzona: #ff7462;

  background: var(--ground);
  color: var(--ink);
  /* Zabrany bilet wylatuje poza sekcję; strona przycina go dopiero na swoim brzegu. */
  overflow: clip;
}

.vb ::selection {
  background: var(--amber);
  color: #1b1400;
}

.vb-cta {
  border-color: var(--amber);
  background: var(--amber);
  color: #1b1400;
}

.vb-cta:hover {
  border-color: #ffc552;
  background: #ffc552;
}

.vb-top {
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

.vb-top__mark {
  margin-right: auto;
  font-weight: 800;
  font-stretch: 82%;
  letter-spacing: -0.005em;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
}

.vb-top__nav {
  display: none;
  gap: 1.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
}

.vb-top__nav a {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  color: var(--ink-soft);
  text-decoration: none;
  transition: color 0.2s ease;
}

.vb-top__nav a:hover {
  color: var(--ink);
}

.vb-top__login {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 650;
  white-space: nowrap;
}

.vb-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.vb-link {
  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  min-height: 3rem;
  font-weight: 650;
}

.vb-link:hover {
  --nudge: 0.2em;
  text-decoration-thickness: 2px;
}

.vb-hero {
  display: grid;
  gap: clamp(1.5rem, 1.1rem + 2vw, 2.5rem);
  padding: clamp(1rem, 0.5rem + 2vw, 2rem) var(--pad) clamp(2rem, 1.5rem + 3vw, 3.5rem);
}

/* Tablica: grafitowa płyta z rzędami klapek. Rozmiar pola liczy się z szerokości tablicy. */
.vb-board {
  --cell: calc((100cqi - 2.9rem) / 18);
  --flap: #37342e;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.9rem;
  padding: 0.9rem 0.8rem 0;
  border-radius: 1rem;
  background: #24221e;
  color: #f6f2e9;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 0.08) inset,
    0 26px 40px -24px rgb(28 26 23 / 0.6);
  overflow: hidden;
  container-type: inline-size;
}

.vb-board :focus-visible {
  outline-color: var(--amber);
}

.vb-board__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-inline: 0.2rem;
  color: var(--amber);
  font-weight: 750;
  font-stretch: 82%;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.vb-board__clock {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.vb-board__rows {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  list-style: none;
}

.vb-row {
  display: grid;
  grid-template-columns: 2.1rem minmax(0, 1fr);
  gap: 0.3rem 0.6rem;
  align-items: center;
  border-radius: 0.5rem;
  text-decoration: none;
}

.vb-row__solid {
  grid-row: 1;
  width: 2.1rem;
  height: 2.1rem;
  color: var(--exam);
}

.vb-row__info {
  grid-column: 2;
  --flap: #3d3421;
  color: var(--amber);
}

.vb-row:hover .vb-row__name {
  --flap: #45413a;
}

/* Pasek z matrycy diod pod rzędami. */
.vb-board__notice {
  margin-inline: -0.8rem;
  padding: 0.6rem 1rem;
  border-top: 1px solid rgb(255 255 255 / 0.12);
  background:
    radial-gradient(circle, rgb(255 178 36 / 0.12) 0.6px, transparent 0.9px) 0 0 / 4px 4px,
    #1b1915;
  color: var(--amber);
  font-size: 0.875rem;
  font-weight: 650;
  font-stretch: 82%;
  letter-spacing: 0.09em;
  line-height: 1.35;
  text-transform: uppercase;
}

.vb-hero__body {
  display: grid;
  gap: 1.1rem;
}

.vb-hero__title {
  font-size: clamp(3.4rem, 1.2rem + 10.5vw, 7.5rem);
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: -0.012em;
  line-height: 0.86;
  text-transform: uppercase;
}

.vb-hero__text {
  display: grid;
  gap: 1rem;
}

.vb-hero__audience {
  max-width: 34ch;
  font-size: clamp(1.1rem, 1rem + 0.55vw, 1.4rem);
  font-weight: 700;
  line-height: 1.25;
}

/* Trzy perony. Na szerokim ekranie stoją w jednym rzędzie. */
.vb-platforms {
  display: grid;
  border-top: 1px solid var(--hairline);
}

.vb-platform {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(5.5rem, 26vw, 8rem);
  gap: 0.75rem 1rem;
  align-items: center;
  padding: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem) var(--gutter);
  border-bottom: 1px solid var(--hairline);
  scroll-margin-top: var(--header-h);
  container-type: inline-size;
}

/* Tablica z nazwą stacji: emaliowany pas w kolorze egzaminu. */
.vb-sign {
  grid-column: 1 / -1;
  justify-self: start;
  max-width: 100%;
  padding: 0.22em 0.5em 0.26em;
  border-radius: 0.2em;
  background: var(--sign);
  color: #fff;
  font-size: clamp(1.7rem, 8.4cqi, 2.6rem);
  font-weight: 800;
  font-stretch: 75%;
  letter-spacing: 0.005em;
  line-height: 0.98;
  text-transform: uppercase;
}

.vb-platform__figure {
  grid-column: 2;
  grid-row: 2;
  aspect-ratio: 1;
  color: var(--sign);
}

.vb-platform__text {
  grid-column: 1;
  grid-row: 2;
  max-width: 34ch;
  line-height: 1.4;
}

.vb-facts {
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / -1;
  gap: 0.6rem 1.75rem;
}

.vb-facts dt {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.vb-facts dd {
  font-size: 1.35rem;
  font-weight: 760;
  font-stretch: 82%;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.vb-section {
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 40rem;
  position: relative;
  display: grid;
  gap: clamp(1.5rem, 1.2rem + 1.6vw, 2.5rem);
  padding: clamp(3rem, 2.2rem + 3.2vw, 5rem) var(--pad);
  border-bottom: 1px solid var(--hairline);
  scroll-margin-top: var(--header-h);
}

.vb-h2 {
  max-width: 17ch;
  font-size: clamp(2rem, 1.5rem + 2.4vw, 3.4rem);
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: -0.008em;
  line-height: 0.96;
  text-transform: uppercase;
  text-wrap: balance;
}

.vb-lead {
  max-width: 46ch;
  color: var(--ink-soft);
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.vb-split__head {
  display: grid;
  gap: 0.9rem;
  align-content: start;
}

.vb-map__head {
  display: grid;
  gap: 0.9rem;
}

/* Mapa na emaliowanej płycie, w kolorach tablic stacji i bursztynie. */
.vb-map__plate {
  --line-1: #d48a00;
  --line-2: #2a66d6;
  --line-3: #168344;
  --line-4: #d42f23;
  --mm-fill: var(--surface);
  --mm-back: var(--ink);
  --mm-back-opacity: 0.22;
  padding: clamp(1rem, 0.8rem + 1.2vw, 2rem);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--card-shadow);
}

.vb-crew__main {
  display: grid;
  gap: clamp(1.25rem, 1rem + 1.2vw, 2rem);
}

.vb-roster {
  display: grid;
  padding: 0;
  border-bottom: 1px solid var(--hairline);
  list-style: none;
}

.vb-post {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.35rem 1rem;
  align-items: center;
  padding-block: 0.95rem;
  border-top: 1px solid var(--hairline);
}

.vb-post__what {
  font-size: clamp(1.25rem, 1.1rem + 0.8vw, 1.65rem);
  font-weight: 780;
  font-stretch: 78%;
  letter-spacing: 0.01em;
  line-height: 1.05;
  text-transform: uppercase;
}

.vb-post__who {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.7rem 0.22rem 0.5rem;
  border-radius: 0.35rem;
  background: var(--ink);
  color: var(--ground);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.vb-post--duty .vb-post__who {
  background: var(--amber);
  color: #1b1400;
}

.vb-post__text {
  grid-column: 1 / -1;
  max-width: 50ch;
  color: var(--ink-soft);
}

.vb-try {
  justify-items: start;
}

.vb-trial {
  justify-self: stretch;
  box-shadow: var(--card-shadow);
}

/* Sekcja z kasownikiem nie może przycinać swojej zawartości, bo zabrany bilet opuszcza ją dołem
   i przelatuje nad następnymi sekcjami. */
.vb-tickets {
  --tp-body: #2a2823;
  --tp-cap: #f6f1e4;
  --tp-cap-ink: #1c1a17;
  --tp-led: var(--amber);
  --tp-screen: #171512;
  --tp-screen-ink: var(--amber);
  --tk-paper: #fffdf8;
  --tk-button: var(--amber);
  --tk-button-ink: #1b1400;
  content-visibility: visible;
  z-index: 3;
}

.vb-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem var(--pad) 2.5rem;
  color: var(--ink-soft);
}

.vb :is(.vb-post, .vb-crew__chat, .vb-trial, .vb-map__plate) {
  transition:
    opacity 0.7s ease var(--reveal-delay, 0ms),
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.vb :is(.vb-post, .vb-crew__chat, .vb-trial, .vb-map__plate).is-waiting {
  opacity: 0;
  translate: 0 1.5rem;
}

/* Tablica stacji zapala się jak świetlówka: dwa mignięcia i pełne światło. */
.vb-sign.is-seen {
  animation: vb-light 0.7s steps(1, end) both;
}

.vb-sign.is-waiting {
  opacity: 0.25;
}

@keyframes vb-light {
  0% {
    opacity: 0.25;
  }

  12% {
    opacity: 1;
  }

  22% {
    opacity: 0.4;
  }

  36% {
    opacity: 1;
  }

  48% {
    opacity: 0.6;
  }

  60%,
  100% {
    opacity: 1;
  }
}

@media (min-width: 44rem) {
  .vb-top__nav {
    display: flex;
  }

  .vb-top__login {
    margin-left: 0.5rem;
  }
}

@media (min-width: 60rem) {
  /* Na szerokim ekranie tablica i tytuł stoją obok siebie, a nazwa i informacja w jednym rzędzie. */
  .vb-hero {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: center;
    column-gap: clamp(2rem, 4vw, 4rem);
  }

  .vb-hero__body {
    grid-row: 1;
    grid-column: 1;
  }

  .vb-board {
    --cell: min(1.75rem, calc((100cqi - 5.7rem) / 32));
    gap: 1rem;
    padding: 1.1rem 1.25rem 0;
  }

  .vb-row {
    grid-template-columns: 2.5rem auto minmax(0, 1fr);
    gap: 1rem;
  }

  .vb-row__solid {
    width: 2.5rem;
    height: 2.5rem;
  }

  .vb-row__info {
    grid-column: auto;
    justify-self: end;
  }

  .vb-board__notice {
    margin-inline: -1.25rem;
    padding-inline: 1.45rem;
  }

  .vb-platforms {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding-inline: calc(var(--pad) - var(--gutter));
  }

  .vb-platform {
    align-content: start;
    border-bottom: 0;
  }

  .vb-platform + .vb-platform {
    border-left: 1px solid var(--hairline);
  }

  .vb-platforms {
    border-bottom: 1px solid var(--hairline);
  }

  .vb-map__head {
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    align-items: end;
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .vb-crew {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: start;
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .vb-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .vb-split__head {
    position: sticky;
    top: calc(var(--header-h) + 2rem);
  }
}
</style>
