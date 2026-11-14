<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
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
import TicketCard from '@/components/landing/TicketCard.vue'
import DutyChat from '@/components/landing2/DutyChat.vue'
import FaqList from '@/components/landing2/FaqList.vue'
import FlapText from '@/components/landing2/FlapText.vue'
import FounderSlot from '@/components/landing2/FounderSlot.vue'
import OpinionList from '@/components/landing2/OpinionList.vue'
import SolidFigure from '@/components/landing2/SolidFigure.vue'
import StepList from '@/components/landing2/StepList.vue'
import TrialTask from '@/components/landing2/TrialTask.vue'
import WhoIcon from '@/components/landing2/WhoIcon.vue'

// Co ile tablica przełącza się między dniami do egzaminu a ceną biletu.
const SWITCH_MS = 5600

const { today, year, cheapest, annualMonths, validUntil } = useOffer()

usePageGround('#131210')

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

const board = useTemplateRef<HTMLElement>('board')
const showPrice = ref(false)
const clock = ref('')
let switchTimer = 0
let clockTimer = 0
let boardVisible = true
let observer: IntersectionObserver | undefined

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

onMounted(() => {
  readClock()
  clockTimer = window.setInterval(readClock, 20_000)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !board.value) return
  observer = new IntersectionObserver(([entry]) => (boardVisible = !!entry?.isIntersecting))
  observer.observe(board.value)
  switchTimer = window.setInterval(() => {
    if (boardVisible && !document.hidden) showPrice.value = !showPrice.value
  }, SWITCH_MS)
})

onBeforeUnmount(() => {
  window.clearInterval(switchTimer)
  window.clearInterval(clockTimer)
  observer?.disconnect()
})

const NOTICE =
  'Zadania układa człowiek · Dyżurny (AI) odpowiada na pytania · Każda powtórka ma nowe liczby · '
</script>

<template>
  <div class="vb">
    <header class="vb-top">
      <a class="vb-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <nav class="vb-top__nav" aria-label="Sekcje">
        <a href="#ludzie">Kto to robi</a>
        <a href="#jak-to-dziala">Jak to działa</a>
        <a href="#bilety">Bilety</a>
      </nav>
      <RouterLink class="vb-top__login" :to="{ name: 'login' }">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="vb-hero" aria-labelledby="vb-title">
        <div ref="board" class="vb-board">
          <div class="vb-board__head">
            <span class="vb-board__label">Odjazdy</span>
            <span class="vb-board__clock" aria-hidden="true">{{ clock }}</span>
          </div>
          <ul class="vb-board__rows">
            <li v-for="(exam, index) in EXAMS" :key="exam.id">
              <a
                class="vb-row"
                :href="`#${exam.id}`"
                :style="{ '--exam': `var(--exam-${exam.id})` }"
              >
                <span class="vb-row__solid" aria-hidden="true">
                  <SolidFigure
                    :kind="exam.solid"
                    :drag="false"
                    :fill="0.94"
                    :weight="0.085"
                    :spin="0.7"
                  />
                </span>
                <FlapText
                  class="vb-row__name"
                  :text="BOARD_NAMES[exam.id]"
                  :cells="18"
                  :delay="index * 380"
                />
                <FlapText
                  class="vb-row__info"
                  :text="info(exam)"
                  :cells="14"
                  :delay="190 + index * 380"
                />
              </a>
            </li>
          </ul>
          <!-- Pasek biegnie w kółko, więc tekst jest w nim dwa razy; czytnik dostaje go raz. -->
          <p class="vb-board__notice">
            <span class="vb-board__notice-text">{{ NOTICE }}</span>
            <span class="vb-board__notice-text" aria-hidden="true">{{ NOTICE }}</span>
          </p>
        </div>

        <div class="vb-hero__body">
          <h1 id="vb-title" class="vb-hero__title">{{ PRODUCT_NAME }}</h1>
          <div class="vb-hero__text">
            <p class="vb-hero__audience">{{ AUDIENCE }}</p>
            <p class="vb-hero__lead">{{ LEAD }} {{ LEAD_SHORT }}</p>
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

      <section
        v-for="(exam, index) in EXAMS"
        :id="exam.id"
        :key="exam.id"
        class="vb-platform"
        :class="{ 'vb-platform--flip': index % 2 === 1 }"
        :style="{ '--exam': `var(--exam-${exam.id})`, '--sign': `var(--sign-${exam.id})` }"
        :aria-labelledby="`vb-${exam.id}`"
      >
        <div v-reveal class="vb-platform__figure" aria-hidden="true">
          <SolidFigure :kind="exam.solid" :fill="0.78" :weight="0.024" />
        </div>
        <div class="vb-platform__body">
          <h2 :id="`vb-${exam.id}`" v-reveal class="vb-sign">{{ exam.name }}</h2>
          <p v-reveal="80" class="vb-platform__text">{{ tidy(exam.description) }}</p>
          <dl v-reveal="140" class="vb-facts">
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
          <div v-reveal="200" class="vb-actions">
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
      </section>

      <section id="ludzie" class="vb-section vb-crew" aria-labelledby="vb-crew-title">
        <div class="vb-crew__head">
          <h2 id="vb-crew-title" class="vb-h2">{{ CREW_TITLE }}</h2>
          <p class="vb-lead">{{ CREW_INTRO }}</p>
        </div>
        <div class="vb-roster">
          <p class="vb-roster__count">Pięć stanowisk. AI obsadza jedno.</p>
          <ul class="vb-roster__rows">
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
                {{ WHO_LABELS[role.who] }}
              </p>
              <p class="vb-post__text">{{ role.text }}</p>
            </li>
          </ul>
        </div>
        <div v-reveal class="vb-crew__chat">
          <DutyChat />
        </div>
      </section>

      <section class="vb-section" aria-label="Zadanie na próbę">
        <TrialTask v-reveal class="vb-trial" />
      </section>

      <section id="jak-to-dziala" class="vb-section vb-split" aria-labelledby="vb-steps-title">
        <div class="vb-split__head">
          <h2 id="vb-steps-title" class="vb-h2">Jak to działa</h2>
          <p class="vb-lead">
            {{
              tidy(
                'Zadania rozwiązujesz w zeszycie, tak jak na egzaminie, a aplikacja prowadzi cię od tematu do tematu.',
              )
            }}
          </p>
        </div>
        <StepList />
      </section>

      <section class="vb-section" aria-labelledby="vb-voices-title">
        <h2 id="vb-voices-title" class="vb-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="vb-section" aria-labelledby="vb-founder-title">
        <h2 id="vb-founder-title" class="vb-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section id="bilety" class="vb-section vb-split" aria-labelledby="vb-tickets-title">
        <div class="vb-split__head">
          <h2 id="vb-tickets-title" class="vb-h2">Bilety</h2>
          <p class="vb-lead">
            {{
              tidy(
                'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
              )
            }}
          </p>
        </div>
        <ol class="vb-tickets">
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

      <section class="vb-section vb-split" aria-labelledby="vb-faq-title">
        <div class="vb-split__head">
          <h2 id="vb-faq-title" class="vb-h2">Pytania</h2>
        </div>
        <FaqList />
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
.vb {
  --ground: #131210;
  --surface: #1d1b18;
  --ink: #f3f0e8;
  --ink-raised: #ffffff;
  --ink-soft: #b4b0a5;
  --hairline: rgb(243 240 232 / 0.16);
  --danger: #ff8b7b;
  --correct: #4fd58d;
  --amber: #ffb224;
  --duty: var(--amber);
  --card: #1d1b18;
  --radius: 1rem;
  --chat-task: #29261f;
  --chat-duty: #29261f;
  --step-fill: #131210;
  --step-line: var(--amber);
  --sign: var(--amber);
  --display-stretch: 82%;
  --display-weight: 780;
  --pad: max(var(--gutter), calc((100vw - 80rem) / 2));

  /* Na ciemnym tle linie brył i biletów potrzebują jaśniejszych odcieni tych samych kolorów. */
  --exam-e8: #6aa0ff;
  --exam-matura-podstawowa: #3fcf80;
  --exam-matura-rozszerzona: #ff7462;
  --sign-e8: #2a66d6;
  --sign-matura-podstawowa: #168344;
  --sign-matura-rozszerzona: #d42f23;

  background: var(--ground);
  color: var(--ink);
  color-scheme: dark;
  scrollbar-color: #5c584f var(--ground);
}

.vb ::selection {
  background: var(--amber);
  color: #1b1400;
}

.vb :focus-visible {
  outline-color: var(--amber);
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

.vb-hero {
  display: grid;
  gap: clamp(1.75rem, 1.2rem + 2.5vw, 3rem);
  padding: clamp(1rem, 0.5rem + 2vw, 2.5rem) var(--pad) clamp(3rem, 2rem + 5vw, 6rem);
}

/* Tablica: czarna płyta z rzędami klapek. Rozmiar pola liczy się z szerokości tablicy. */
.vb-board {
  --cell: calc((100cqi - 2.9rem) / 18);
  display: grid;
  /* Bez tego biegnący pasek rozpychałby całą tablicę do swojej szerokości. */
  grid-template-columns: minmax(0, 1fr);
  gap: 0.9rem;
  padding: 0.9rem 0.8rem 0;
  border: 1px solid var(--hairline);
  border-radius: 1rem;
  background: #0a0908;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 0.05) inset,
    0 30px 60px -30px rgb(0 0 0 / 0.9);
  overflow: hidden;
  container-type: inline-size;
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
  --flap: #2a2416;
  color: var(--amber);
}

.vb-row:hover .vb-row__name {
  --flap: #33302b;
}

/* Pasek z matrycy diod pod rzędami. */
.vb-board__notice {
  display: flex;
  margin-inline: -0.8rem;
  padding-block: 0.55rem;
  border-top: 1px solid var(--hairline);
  background:
    radial-gradient(circle, rgb(255 178 36 / 0.09) 0.6px, transparent 0.9px) 0 0 / 4px 4px,
    #0f0d0a;
  color: var(--amber);
  font-size: 0.875rem;
  font-weight: 650;
  font-stretch: 82%;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  white-space: pre;
}

.vb-board__notice-text {
  flex: none;
}

.vb-hero__body {
  display: grid;
  gap: 1.25rem;
}

.vb-hero__title {
  font-size: clamp(3.4rem, 1.2rem + 10.5vw, 9rem);
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: -0.012em;
  line-height: 0.86;
  text-transform: uppercase;
}

.vb-hero__text {
  display: grid;
  gap: 0.9rem;
}

.vb-hero__audience {
  max-width: 34ch;
  font-size: clamp(1.1rem, 1rem + 0.55vw, 1.4rem);
  font-weight: 700;
  line-height: 1.25;
}

.vb-hero__lead {
  max-width: 44ch;
  color: var(--ink-soft);
}

.vb-hero .vb-actions {
  margin-top: 0.4rem;
}

.vb-platform {
  content-visibility: auto;
  contain-intrinsic-size: auto 46rem;
  display: grid;
  gap: 1.25rem;
  padding: clamp(2.5rem, 1.5rem + 5vw, 5.5rem) var(--pad);
  border-top: 1px solid var(--hairline);
  scroll-margin-top: var(--header-h);
}

.vb-platform__figure {
  height: clamp(14rem, 38svh, 24rem);
  color: var(--exam);
  /* Światło peronu za bryłą. */
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--exam) 16%, transparent),
    transparent
  );
}

.vb-platform__body {
  display: grid;
  gap: 1.1rem;
  justify-items: start;
  container-type: inline-size;
}

/* Tablica z nazwą stacji: emaliowany pas w kolorze egzaminu. */
.vb-sign {
  max-width: 100%;
  padding: 0.22em 0.5em 0.26em;
  border-radius: 0.2em;
  background: var(--sign);
  color: #fff;
  font-size: clamp(2rem, 10.5cqi, 5rem);
  font-weight: 800;
  font-stretch: 75%;
  letter-spacing: 0.005em;
  line-height: 0.98;
  text-transform: uppercase;
}

.vb-platform__text {
  max-width: 42ch;
  font-size: clamp(1.0625rem, 1rem + 0.45vw, 1.3rem);
  line-height: 1.45;
}

.vb-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 2rem;
}

.vb-facts dt {
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.vb-facts dd {
  color: var(--amber);
  font-size: 1.5rem;
  font-weight: 760;
  font-stretch: 82%;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.vb-section {
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 46rem;
  display: grid;
  gap: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
  padding: clamp(3.5rem, 2.5rem + 5vw, 7rem) var(--pad);
  border-top: 1px solid var(--hairline);
  scroll-margin-top: var(--header-h);
}

.vb-h2 {
  max-width: 15ch;
  font-size: clamp(2.2rem, 1.5rem + 3.6vw, 4.5rem);
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: -0.008em;
  line-height: 0.96;
  text-transform: uppercase;
}

.vb-lead {
  max-width: 44ch;
  margin-top: 1.1rem;
  color: var(--ink-soft);
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.45;
}

.vb-roster {
  display: grid;
  gap: 1rem;
}

.vb-roster__count {
  color: var(--amber);
  font-size: clamp(1.25rem, 1.1rem + 0.8vw, 1.75rem);
  font-weight: 760;
  font-stretch: 82%;
}

.vb-roster__rows {
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
  padding-block: 1rem;
  border-top: 1px solid var(--hairline);
}

.vb-post__what {
  font-size: clamp(1.3rem, 1.1rem + 0.9vw, 1.8rem);
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
  background: #2b2925;
  font-size: 0.875rem;
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

.vb-trial {
  border: 1px solid var(--hairline);
}

.vb-tickets {
  display: grid;
  gap: 1.25rem;
  padding: 0;
  list-style: none;
}

.vb-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem var(--pad) 2.5rem;
  border-top: 1px solid var(--hairline);
  color: var(--ink-soft);
}

.vb
  :is(
    .vb-platform__figure,
    .vb-platform__text,
    .vb-facts,
    .vb-actions,
    .vb-post,
    .vb-crew__chat,
    .vb-trial
  ) {
  transition:
    opacity 0.7s ease var(--reveal-delay, 0ms),
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.vb
  :is(.vb-platform__text, .vb-facts, .vb-actions, .vb-post, .vb-crew__chat, .vb-trial).is-waiting {
  opacity: 0;
  translate: 0 1.5rem;
}

.vb-platform__figure.is-waiting {
  opacity: 0;
}

/* Tablica stacji zapala się jak świetlówka: dwa mignięcia i pełne światło. */
.vb-sign.is-seen {
  animation: vb-light 0.7s steps(1, end) both;
}

.vb-sign.is-waiting {
  opacity: 0.15;
}

@keyframes vb-light {
  0% {
    opacity: 0.15;
  }
  12% {
    opacity: 1;
  }
  22% {
    opacity: 0.3;
  }
  36% {
    opacity: 1;
  }
  48% {
    opacity: 0.55;
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
  /* Na szerokim ekranie nazwa i informacja stoją w jednym rzędzie. */
  .vb-board {
    --cell: min(2.2rem, calc((100cqi - 5.7rem) / 32));
    gap: 1.1rem;
    padding: 1.25rem 1.5rem 0;
  }

  .vb-board__head {
    font-size: 1.15rem;
  }

  .vb-board__rows {
    gap: 0.9rem;
  }

  .vb-row {
    grid-template-columns: 3rem auto minmax(0, 1fr);
    gap: 1.25rem;
  }

  .vb-row__solid {
    width: 3rem;
    height: 3rem;
  }

  .vb-row__info {
    grid-column: auto;
    justify-self: end;
  }

  .vb-board__notice {
    margin-inline: -1.5rem;
    font-size: 1rem;
  }

  .vb-hero__body {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    align-items: end;
    column-gap: var(--gutter);
  }

  .vb-platform {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: center;
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .vb-platform__figure {
    height: clamp(20rem, 60svh, 32rem);
  }

  .vb-platform--flip .vb-platform__figure {
    grid-column: 2;
    grid-row: 1;
  }

  .vb-platform--flip .vb-platform__body {
    grid-column: 1;
    grid-row: 1;
  }

  .vb-platform--flip {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  }

  .vb-crew {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: start;
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .vb-crew__head {
    grid-column: 1 / -1;
  }

  .vb-crew__chat {
    position: sticky;
    top: calc(var(--header-h) + 1.5rem);
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

@media (prefers-reduced-motion: no-preference) {
  .vb-board__notice-text {
    animation: vb-notice 28s linear infinite;
  }
}

@keyframes vb-notice {
  to {
    translate: -100% 0;
  }
}
</style>
