<script setup lang="ts">
import { computed } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { BASIC_MAP, EXTENDED_MAP } from '@/maps'
import type { TopicMap } from '@/maps/types'
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

function stationNames(map: TopicMap): string[] {
  const ids = new Set(map.graph.lines.flatMap((line) => line.stations))
  return [...ids].map((id) => {
    const station = map.graph.stations[id]!
    return station.shortName ?? station.name
  })
}

// Matury biorą stacje z prawdziwych map tematów. Mapy E8 jeszcze nie ma, więc tu stoją działy
// z wymagań egzaminu.
const TOPICS: Record<Exam['id'], string[]> = {
  e8: [
    'Liczby',
    'Procenty',
    'Potęgi i pierwiastki',
    'Wyrażenia algebraiczne',
    'Równania',
    'Figury płaskie',
    'Bryły',
    'Statystyka',
  ],
  'matura-podstawowa': stationNames(BASIC_MAP),
  'matura-rozszerzona': stationNames(EXTENDED_MAP),
}

// Tory schematu na górze strony, w układzie 360 × 380.
const TRACKS: Record<Exam['id'], string> = {
  e8: 'M180 40V84L62 202V290',
  'matura-podstawowa': 'M180 40V290',
  'matura-rozszerzona': 'M180 40V84L298 202V290',
}

const HUBS: Record<Exam['id'], number> = {
  e8: 62,
  'matura-podstawowa': 180,
  'matura-rozszerzona': 298,
}

const humans = computed(() => CREW.filter((role) => role.who !== 'duty'))
const duty = computed(() => CREW.find((role) => role.who === 'duty')!)

function meta(exam: Exam): string {
  const days = daysToExam(exam.id, today)
  return `Do egzaminu ${days} ${plural(days, ['dzień', 'dni', 'dni'])}, bilet od ${formatPrice(exam.prices.monthly)}`
}
</script>

<template>
  <div class="vc">
    <header class="vc-top">
      <a class="vc-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <nav class="vc-top__nav" aria-label="Sekcje">
        <a href="#linie">Egzaminy</a>
        <a href="#ludzie">Kto to robi</a>
        <a href="#bilety">Bilety</a>
      </nav>
      <RouterLink class="vc-top__login" :to="{ name: 'login' }">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="vc-hero" aria-labelledby="vc-title">
        <div class="vc-hero__body">
          <h1 id="vc-title" class="vc-hero__title">{{ PRODUCT_NAME }}</h1>
          <p class="vc-hero__audience">{{ AUDIENCE }}</p>
          <p class="vc-hero__lead">{{ LEAD }} {{ LEAD_SHORT }}</p>
          <div class="vc-actions">
            <RouterLink class="button" :to="{ name: 'register' }">
              Załóż konto
              <ArrowIcon />
            </RouterLink>
            <a v-if="cheapest" class="button button--quiet" href="#bilety">
              Bilety już od {{ formatPrice(cheapest.price) }}
            </a>
          </div>
        </div>

        <div class="vc-net">
          <svg class="vc-net__tracks" viewBox="0 0 360 380" aria-hidden="true">
            <g v-for="(exam, index) in EXAMS" :key="exam.id" :style="{ '--order': index }">
              <path
                class="vc-net__track"
                :d="TRACKS[exam.id]"
                :stroke="`var(--exam-${exam.id})`"
                pathLength="1"
              />
              <rect class="vc-net__train" x="-11" y="-5.5" width="22" height="11" rx="5.5">
                <animateMotion
                  :path="TRACKS[exam.id]"
                  :begin="`${1.4 + index * 1.3}s`"
                  dur="7s"
                  repeatCount="indefinite"
                  rotate="auto"
                  calcMode="spline"
                  keyPoints="0;0.86;0.86;0;0"
                  keyTimes="0;0.4;0.5;0.9;1"
                  keySplines="0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1;0 0 1 1"
                />
              </rect>
            </g>
            <circle class="vc-net__stop" cx="121" cy="143" r="7" />
            <circle class="vc-net__stop" cx="239" cy="143" r="7" />
            <circle class="vc-net__stop" cx="180" cy="150" r="7" />
            <circle class="vc-net__start" cx="180" cy="40" r="15" />
          </svg>
          <p class="vc-net__board">Tu wsiadasz</p>
          <a
            v-for="exam in EXAMS"
            :key="exam.id"
            class="vc-net__hub"
            :href="`#${exam.id}`"
            :style="{ '--exam': `var(--exam-${exam.id})`, '--x': HUBS[exam.id] }"
          >
            <span class="vc-hub">
              <SolidFigure :kind="exam.solid" :drag="false" :fill="0.72" :weight="0.05" />
            </span>
            <span class="vc-net__name">{{ exam.shortName }}</span>
          </a>
        </div>
      </section>

      <div class="vc-route">
        <div class="vc-route__train" aria-hidden="true"><span /></div>

        <section id="linie" class="vc-stop" aria-labelledby="vc-lines-title">
          <h2 id="vc-lines-title" v-reveal class="vc-stop__name">Trzy linie, trzy egzaminy</h2>
          <div class="vc-lines">
            <article
              v-for="exam in EXAMS"
              :id="exam.id"
              :key="exam.id"
              class="vc-line"
              :style="{ '--exam': `var(--exam-${exam.id})` }"
            >
              <div v-reveal class="vc-hub vc-line__hub" aria-hidden="true">
                <SolidFigure :kind="exam.solid" :fill="0.7" :weight="0.04" />
              </div>
              <div class="vc-line__body">
                <h3 class="vc-line__name">{{ exam.name }}</h3>
                <p class="vc-line__text">{{ tidy(exam.description) }}</p>
                <p class="vc-line__meta">{{ meta(exam) }}</p>
                <div class="vc-actions">
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
              <!-- Stacje linii jadą w kółko, więc lista jest dwa razy; czytnik dostaje ją raz. -->
              <div class="vc-strip" :style="{ '--count': TOPICS[exam.id].length }">
                <ul
                  v-for="copy in 2"
                  :key="copy"
                  class="vc-strip__run"
                  :aria-hidden="copy === 2 ? 'true' : undefined"
                  :aria-label="copy === 1 ? 'Stacje tej linii' : undefined"
                >
                  <li v-for="topic in TOPICS[exam.id]" :key="topic" class="vc-strip__stop">
                    {{ topic }}
                  </li>
                </ul>
              </div>
            </article>
          </div>
        </section>

        <section id="ludzie" class="vc-stop" aria-labelledby="vc-crew-title">
          <h2 id="vc-crew-title" v-reveal class="vc-stop__name">{{ CREW_TITLE }}</h2>
          <p class="vc-lead">{{ CREW_INTRO }}</p>
          <div class="vc-crew">
            <div class="vc-branch vc-branch--human">
              <p class="vc-branch__sign">
                <span class="vc-branch__bullet">L</span>
                Linia ludzi
              </p>
              <ul class="vc-branch__stops">
                <li
                  v-for="(role, index) in humans"
                  :key="role.what"
                  v-reveal="index * 80"
                  class="vc-role"
                  :class="`vc-role--${role.who}`"
                >
                  <h3 class="vc-role__what">
                    {{ role.what }}
                    <span class="vc-role__who">
                      <WhoIcon :who="role.who" />
                      {{ WHO_LABELS[role.who] }}
                    </span>
                  </h3>
                  <p>{{ role.text }}</p>
                </li>
              </ul>
            </div>
            <div class="vc-branch vc-branch--duty">
              <p class="vc-branch__sign">
                <span class="vc-branch__bullet">D</span>
                Linia Dyżurnego
              </p>
              <ul class="vc-branch__stops">
                <li v-reveal class="vc-role vc-role--duty">
                  <h3 class="vc-role__what">
                    {{ duty.what }}
                    <span class="vc-role__who">
                      <WhoIcon who="duty" />
                      {{ WHO_LABELS.duty }}
                    </span>
                  </h3>
                  <p>{{ duty.text }}</p>
                  <DutyChat class="vc-crew__chat" />
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="vc-stop" aria-label="Zadanie na próbę">
          <TrialTask v-reveal class="vc-card" />
        </section>

        <section id="jak-to-dziala" class="vc-stop" aria-labelledby="vc-steps-title">
          <h2 id="vc-steps-title" v-reveal class="vc-stop__name">Jak to działa</h2>
          <p class="vc-lead">
            {{
              tidy(
                'Zadania rozwiązujesz w zeszycie, tak jak na egzaminie, a aplikacja prowadzi cię od tematu do tematu.',
              )
            }}
          </p>
          <StepList class="vc-steps" />
        </section>

        <section class="vc-stop vc-stop--field" aria-labelledby="vc-voices-title">
          <h2 id="vc-voices-title" v-reveal class="vc-stop__name">Co mówią uczniowie i rodzice</h2>
          <OpinionList />
        </section>

        <section class="vc-stop" aria-labelledby="vc-founder-title">
          <h2 id="vc-founder-title" v-reveal class="vc-stop__name">Kto za tym stoi</h2>
          <FounderSlot />
        </section>

        <section id="bilety" class="vc-stop" aria-labelledby="vc-tickets-title">
          <h2 id="vc-tickets-title" v-reveal class="vc-stop__name">Kasa biletowa</h2>
          <p class="vc-lead">
            {{
              tidy(
                'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
              )
            }}
          </p>
          <ol class="vc-tickets">
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

        <section class="vc-stop" aria-labelledby="vc-faq-title">
          <h2 id="vc-faq-title" v-reveal class="vc-stop__name">Pytania</h2>
          <FaqList />
        </section>

        <section class="vc-stop vc-stop--last" aria-labelledby="vc-end-title">
          <h2 id="vc-end-title" v-reveal class="vc-stop__name">Wsiadasz?</h2>
          <div class="vc-actions">
            <RouterLink class="button" :to="{ name: 'register' }">
              Załóż konto
              <ArrowIcon />
            </RouterLink>
          </div>
        </section>
      </div>
    </main>

    <footer class="vc-foot">
      <p>{{ PRODUCT_NAME }}, {{ year }}</p>
    </footer>
  </div>
</template>

<style scoped>
.vc {
  --human: #294288;
  --program: #066f69;
  --duty: #b4510a;
  --duty-line: #e67a2a;
  --radius: 1.25rem;
  --card-shadow: 0 1px 1px rgb(29 31 34 / 0.06), 0 10px 22px -10px rgb(29 31 34 / 0.18);
  --display-weight: 800;
  --step-line: var(--program);
  --pad: max(var(--gutter), calc((100vw - 80rem) / 2));
  /* Odległość linii trasy od lewej krawędzi treści i miejsce, które treść jej zostawia. */
  --rail: 0.55rem;
  --berth: 2.6rem;
}

.vc ::selection {
  background: var(--human);
  color: #fff;
}

.vc-top {
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

.vc-top__mark {
  margin-right: auto;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-decoration: none;
  white-space: nowrap;
}

.vc-top__nav {
  display: none;
  gap: 1.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
}

.vc-top__nav a {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  color: var(--ink-soft);
  text-decoration: none;
  transition: color 0.2s ease;
}

.vc-top__nav a:hover {
  color: var(--ink);
}

.vc-top__login {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 650;
  white-space: nowrap;
}

.vc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.vc-hero {
  display: grid;
  gap: 2rem;
  padding: clamp(2rem, 1rem + 4vw, 4rem) var(--pad) clamp(2.5rem, 2rem + 3vw, 4.5rem);
  /* Papier schematu: drobna siatka punktów. */
  background: radial-gradient(circle, rgb(29 31 34 / 0.13) 1px, transparent 1.4px) 0 0 / 1.5rem
    1.5rem;
}

.vc-hero__body {
  display: grid;
  gap: 1rem;
  align-content: center;
}

.vc-hero__title {
  font-size: clamp(3.4rem, 1.6rem + 8.4vw, 7.25rem);
  font-weight: 850;
  font-stretch: 104%;
  letter-spacing: -0.04em;
  line-height: 0.9;
}

.vc-hero__audience {
  max-width: 32ch;
  margin-top: 0.4rem;
  font-size: clamp(1.1rem, 1rem + 0.55vw, 1.4rem);
  font-weight: 700;
  line-height: 1.25;
}

.vc-hero__lead {
  max-width: 44ch;
  color: var(--ink-soft);
}

.vc-hero .vc-actions {
  margin-top: 0.5rem;
}

/* Schemat: tory w SVG, a węzły z bryłami leżą na nim w tych samych współrzędnych. */
.vc-net {
  position: relative;
  width: 100%;
  max-width: 34rem;
  margin-inline: auto;
  aspect-ratio: 360 / 420;
}

.vc-net__tracks {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  overflow: visible;
}

.vc-net__track {
  fill: none;
  stroke-width: 13;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.vc-net__stop,
.vc-net__start {
  fill: var(--surface);
  stroke: var(--ink);
  stroke-width: 5;
}

.vc-net__start {
  stroke-width: 7;
}

.vc-net__train {
  fill: var(--ink);
}

.vc-net__board {
  position: absolute;
  top: calc(40 / 420 * 100%);
  left: calc(50% + 1.9rem);
  translate: 0 -50%;
  font-size: 0.9375rem;
  font-weight: 650;
  white-space: nowrap;
}

.vc-net__hub {
  position: absolute;
  top: calc(290 / 420 * 100%);
  left: calc(var(--x) / 360 * 100%);
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  width: 31%;
  translate: -50% -15.5cqi;
  text-decoration: none;
}

.vc-net {
  container-type: inline-size;
}

.vc-hub {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border: clamp(0.35rem, 1.6cqi, 0.6rem) solid var(--exam);
  border-radius: 50%;
  background: var(--surface);
  color: var(--exam);
  transition: scale 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.vc-net__hub:hover .vc-hub {
  scale: 1.06;
}

.vc-net__name {
  font-size: clamp(0.9375rem, 3.6cqi, 1.2rem);
  font-weight: 750;
  letter-spacing: -0.01em;
}

/* Linia trasy biegnie przez całą stronę, a pociąg trzyma się środka ekranu. */
.vc-route {
  position: relative;
  padding-bottom: 1rem;
}

.vc-route::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 3rem;
  left: calc(var(--pad) + var(--rail));
  z-index: 1;
  width: 0.5rem;
  border-radius: 0 0 0.25rem 0.25rem;
  background: var(--ink);
}

.vc-route__train {
  position: sticky;
  top: 46svh;
  z-index: 2;
  height: 0;
  margin-left: calc(var(--pad) + var(--rail) - 0.3rem);
}

.vc-route__train span {
  display: block;
  width: 1.1rem;
  height: 2.6rem;
  border: 0.2rem solid var(--ground);
  border-radius: 0.55rem;
  background: var(--map-last);
}

.vc-stop {
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 46rem;
  position: relative;
  display: grid;
  gap: 1.5rem;
  padding: clamp(3rem, 2rem + 5vw, 6rem) var(--pad) clamp(2rem, 1.5rem + 3vw, 4rem)
    calc(var(--pad) + var(--berth));
  scroll-margin-top: var(--header-h);
}

.vc-stop__name {
  position: relative;
  max-width: 16ch;
  font-size: clamp(2.1rem, 1.4rem + 3.4vw, 4.25rem);
  font-weight: 830;
  letter-spacing: -0.035em;
  line-height: 0.98;
}

/* Stacja na linii trasy, na wysokości nazwy. */
.vc-stop__name::before {
  content: '';
  position: absolute;
  top: 0.12em;
  left: calc(-1 * var(--berth) + var(--rail) - 0.45rem);
  z-index: 1;
  width: 1.4rem;
  height: 1.4rem;
  border: 0.35rem solid var(--ink);
  border-radius: 50%;
  background: var(--surface);
  transition: scale 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.vc-stop__name.is-waiting::before {
  scale: 0;
}

.vc-stop__name {
  transition:
    opacity 0.6s ease,
    translate 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.vc-stop__name.is-waiting {
  opacity: 0;
  translate: -1.25rem 0;
}

.vc-lead {
  max-width: 46ch;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.45;
}

.vc-lines {
  display: grid;
  gap: clamp(2.5rem, 2rem + 3vw, 4.5rem);
}

.vc-line {
  display: grid;
  grid-template-columns: 4.75rem minmax(0, 1fr);
  gap: 0.75rem 1rem;
  align-items: center;
  scroll-margin-top: calc(var(--header-h) + 1rem);
}

.vc-line__hub {
  border-width: clamp(0.35rem, 1.3vw, 0.6rem);
  transition: scale 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.vc-line__hub.is-waiting {
  scale: 0.6;
}

/* Na telefonie obok węzła stoi sama nazwa, a opis ma całą szerokość. */
.vc-line__body {
  display: contents;
}

.vc-line__body > :not(.vc-line__name) {
  grid-column: 1 / -1;
}

.vc-line__name {
  font-size: clamp(1.6rem, 1.2rem + 2vw, 2.75rem);
  font-weight: 820;
  letter-spacing: -0.03em;
  line-height: 1;
}

.vc-line__text {
  max-width: 46ch;
}

.vc-line__meta {
  color: var(--ink-soft);
  font-size: 0.9375rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.vc-line .vc-actions {
  margin-top: 0.4rem;
}

.vc-strip {
  display: flex;
  grid-column: 1 / -1;
  min-width: 0;
  margin-top: 0.5rem;
  margin-right: calc(-1 * var(--pad));
  overflow: hidden;
  mask-image: linear-gradient(
    to right,
    transparent,
    #000 2rem,
    #000 calc(100% - 3rem),
    transparent
  );
}

.vc-strip__run {
  display: flex;
  flex: none;
  padding: 0;
  list-style: none;
}

.vc-strip__stop {
  position: relative;
  padding: 1.7rem 1.75rem 0.25rem 0;
  border-top: 0.55rem solid var(--exam);
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: nowrap;
}

.vc-strip__stop::before {
  content: '';
  position: absolute;
  top: -0.85rem;
  left: 0.15rem;
  width: 1.15rem;
  height: 1.15rem;
  border: 0.28rem solid var(--ink);
  border-radius: 50%;
  background: var(--surface);
}

.vc-crew {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2.5rem;
}

.vc-branch {
  --branch: var(--human);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  align-content: start;
}

.vc-branch--duty {
  --branch: var(--duty-line);
}

.vc-branch__sign {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.15rem;
  font-weight: 780;
  letter-spacing: -0.01em;
}

/* Znak linii jak na schemacie: litera w kole w kolorze linii. */
.vc-branch__bullet {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  background: var(--branch);
  color: #fff;
  font-size: 1.05rem;
  font-weight: 800;
}

.vc-branch--duty .vc-branch__bullet {
  color: #1d1f22;
}

.vc-branch__stops {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin-left: 0.8rem;
  padding: 0;
  list-style: none;
}

.vc-role {
  position: relative;
  padding: 0 0 1.6rem 2.1rem;
  transition:
    opacity 0.6s ease var(--reveal-delay, 0ms),
    translate 0.8s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.vc-role.is-waiting {
  opacity: 0;
  translate: 0 1.25rem;
}

.vc-role::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 0.5rem;
  background: var(--branch);
}

.vc-role:last-child::after {
  bottom: auto;
  height: 0.9rem;
}

.vc-role::before {
  content: '';
  position: absolute;
  top: 0.15rem;
  left: -0.4rem;
  z-index: 1;
  width: 1.3rem;
  height: 1.3rem;
  border: 0.3rem solid var(--ink);
  border-radius: 50%;
  background: var(--surface);
}

/* Wynik liczy program: stacja kwadratowa, żeby różniła się od stacji obsadzonych przez ludzi. */
.vc-role--program::before {
  border-radius: 0.2rem;
}

.vc-role__what {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.8rem;
  margin-bottom: 0.3rem;
  font-size: clamp(1.25rem, 1.1rem + 0.7vw, 1.6rem);
  font-weight: 780;
  letter-spacing: -0.018em;
  line-height: 1.15;
}

.vc-role__who {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--human);
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 0;
}

.vc-role--program .vc-role__who {
  color: var(--program);
}

.vc-role--duty .vc-role__who {
  color: var(--duty);
}

.vc-role p {
  max-width: 46ch;
  color: var(--ink-soft);
}

.vc-crew__chat {
  margin-top: 1.25rem;
}

.vc-card {
  transition:
    opacity 0.6s ease,
    translate 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.vc-card.is-waiting {
  opacity: 0;
  translate: 0 1.5rem;
}

.vc-steps {
  margin-top: 0.5rem;
}

/* Pole w kolorze najmocniejszej linii mapy pod opinie. */
.vc-stop--field {
  --card: #fff;
  --note: #1d1f22;
  background: #f4c53d;
}

.vc-tickets {
  display: grid;
  gap: 1.25rem;
  padding: 0;
  list-style: none;
}

/* Stacja końcowa: większa, z podwójnym pierścieniem. */
.vc-stop--last {
  padding-bottom: clamp(4rem, 3rem + 5vw, 7rem);
}

.vc-stop--last .vc-stop__name::before {
  top: 0.02em;
  left: calc(-1 * var(--berth) + var(--rail) - 0.7rem);
  width: 1.9rem;
  height: 1.9rem;
  box-shadow:
    0 0 0 0.3rem var(--ground),
    0 0 0 0.6rem var(--ink);
}

.vc-foot {
  padding: 1.75rem var(--pad) 2.25rem;
  border-top: 1px solid var(--hairline);
  color: var(--ink-soft);
  font-size: 0.9375rem;
}

@media (min-width: 44rem) {
  .vc-top__nav {
    display: flex;
  }

  .vc-top__login {
    margin-left: 0.5rem;
  }

  .vc {
    --rail: 1rem;
    --berth: 4.5rem;
  }
}

@media (min-width: 60rem) {
  .vc-hero {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: center;
    min-height: calc(100svh - var(--header-h));
  }

  .vc-net {
    max-width: none;
  }

  .vc-line {
    grid-template-columns: 11rem minmax(0, 1fr);
    gap: 1.1rem 2.5rem;
    align-items: start;
  }

  .vc-line__body {
    display: grid;
    gap: 0.6rem;
  }

  .vc-crew {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: clamp(2rem, 5vw, 5rem);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .vc-net__track {
    stroke-dasharray: 1;
    animation: vc-draw 1.5s cubic-bezier(0.65, 0, 0.35, 1) calc(0.15s + var(--order) * 0.18s) both;
  }

  .vc-net__stop,
  .vc-net__start {
    transform-box: fill-box;
    transform-origin: center;
    animation: vc-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.9s both;
  }

  .vc-net__start {
    animation-delay: 0s;
  }

  .vc-net__hub .vc-hub {
    animation: vc-pop 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.25s both;
  }

  .vc-strip__run {
    animation: vc-run calc(var(--count) * 3.4s) linear infinite;
  }

  .vc-strip:hover .vc-strip__run {
    animation-play-state: paused;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vc-net__train {
    display: none;
  }

  /* Bez ruchu pas stacji da się przewinąć palcem. */
  .vc-strip {
    overflow-x: auto;
  }

  .vc-strip__run[aria-hidden='true'] {
    display: none;
  }
}

@keyframes vc-draw {
  from {
    stroke-dashoffset: 1;
  }
}

@keyframes vc-pop {
  from {
    scale: 0;
  }
}

@keyframes vc-run {
  to {
    translate: -100% 0;
  }
}
</style>
