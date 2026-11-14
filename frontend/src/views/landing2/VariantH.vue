<script setup lang="ts">
import { EXAMS } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import {
  AUDIENCE,
  CREW,
  CREW_INTRO,
  CREW_TITLE,
  WHO_LABELS,
  examDay,
  tidy,
} from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import { vReveal } from '@/landing2/reveal'
import { formatPrice } from '@/utils/tickets'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import TicketCard from '@/components/landing/TicketCard.vue'
import DutyChat from '@/components/landing2/DutyChat.vue'
import FaqList from '@/components/landing2/FaqList.vue'
import FounderSlot from '@/components/landing2/FounderSlot.vue'
import MathText from '@/components/landing2/MathText.vue'
import OpinionList from '@/components/landing2/OpinionList.vue'
import SolidFigure from '@/components/landing2/SolidFigure.vue'
import TrialTask from '@/components/landing2/TrialTask.vue'
import WhoIcon from '@/components/landing2/WhoIcon.vue'

const { year, cheapest, annualMonths, validUntil } = useOffer()

const examDate = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' }).format(
  examDay('matura-podstawowa'),
)

// Tydzień ucznia opowiedziany jak rozkład jazdy. Godziny to scenki, nie obietnice.
const STOPS = [
  {
    day: 'poniedziałek',
    time: '7:42',
    place: 'W autobusie',
    text: 'Kilka zadań z powtórek, zanim dojedziesz do szkoły. Te same typy co tydzień temu, ale z innymi liczbami, więc liczysz, a nie przypominasz sobie wynik.',
    extra: 'repeats',
  },
  {
    day: 'wtorek',
    time: '16:10',
    place: 'Po lekcjach',
    text: 'Bierzesz kolejną stację z mapy tematów. Mapa podpowiada, co teraz, ale niczego nie blokuje.',
    extra: '',
  },
  {
    day: 'środa',
    time: '20:30',
    place: 'Utknąłeś',
    text: 'Pytasz Dyżurnego. Podpowiada następny krok i nie rozwiązuje zadania za ciebie.',
    extra: 'chat',
  },
  {
    day: 'sobota',
    time: '10:00',
    place: 'Arkusz',
    text: 'Co kilka tygodni rozwiązujesz arkusz podobny do poprzedniego i widzisz, ile punktów przybyło. Dostajesz też szacunkowy wynik egzaminu, podany jako przedział.',
    extra: '',
  },
  {
    day: 'niedziela',
    time: '19:00',
    place: 'Wiadomość do rodzica',
    text: 'Rodzic, jeśli chce, dostaje krótkie podsumowanie tygodnia. Widzi postępy, niczego w nich nie zmienia.',
    extra: '',
  },
] as const

// To samo zadanie w trzech powtórkach, zapisane tak jak w zadaniu próbnym.
const REPEATS = ['log_{2} 32 + log_{3} 9', 'log_{3} 81 − log_{5} 25', 'log_{5} 125 + log_{2} 16']
</script>

<template>
  <div class="vh">
    <header class="vh-top">
      <a class="vh-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <nav class="vh-top__nav" aria-label="Sekcje">
        <a href="#rozklad">Rozkład</a>
        <a href="#ludzie">Kto to robi</a>
        <a href="#bilety">Bilety</a>
      </nav>
      <RouterLink class="vh-top__login" :to="{ name: 'login' }">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="vh-hero" aria-labelledby="vh-title">
        <div class="vh-hero__body">
          <h1 id="vh-title" class="vh-hero__title">Do matury dojedziesz po kolei.</h1>
          <p class="vh-hero__lead">
            {{ AUDIENCE }}
            {{ tidy('Zamiast wielkiego planu masz rozkład: mało naraz, ale codziennie.') }}
          </p>
          <div class="vh-actions">
            <RouterLink class="button" :to="{ name: 'register' }">
              Załóż konto
              <ArrowIcon />
            </RouterLink>
            <a v-if="cheapest" class="button button--quiet" href="#bilety">
              Bilety już od {{ formatPrice(cheapest.price) }}
            </a>
          </div>
        </div>

        <!-- Tablica kierunków: trzy egzaminy jako trzy pociągi. -->
        <ul class="vh-lines">
          <li
            v-for="(exam, index) in EXAMS"
            :key="exam.id"
            class="vh-line"
            :style="{ '--exam': `var(--exam-${exam.id})` }"
          >
            <span class="vh-line__solid" aria-hidden="true">
              <SolidFigure :kind="exam.solid" :drag="false" :fill="0.86" :weight="0.07" />
            </span>
            <span class="vh-line__name">{{ exam.name }}</span>
            <span class="vh-line__platform">peron {{ index + 1 }}</span>
          </li>
        </ul>
      </section>

      <section id="rozklad" class="vh-sheet" aria-labelledby="vh-sheet-title">
        <h2 id="vh-sheet-title" class="vh-sheet__title">Rozkład jazdy: zwykły tydzień</h2>
        <ol class="vh-stops">
          <li v-for="stop in STOPS" :key="stop.time" v-reveal class="vh-stop">
            <p class="vh-stop__time">
              <span class="vh-stop__day">{{ stop.day }}</span>
              {{ stop.time }}
            </p>
            <div class="vh-stop__body">
              <h3 class="vh-stop__place">{{ stop.place }}</h3>
              <p class="vh-stop__text">{{ tidy(stop.text) }}</p>
              <ul
                v-if="stop.extra === 'repeats'"
                class="vh-repeats"
                aria-label="To samo zadanie w trzech powtórkach"
              >
                <li v-for="(task, index) in REPEATS" :key="task" class="vh-repeats__task">
                  <span class="vh-repeats__when">powtórka {{ index + 1 }}</span>
                  <span><MathText :text="task" /></span>
                </li>
              </ul>
              <DutyChat v-if="stop.extra === 'chat'" class="vh-stop__chat" />
            </div>
          </li>
          <li v-reveal class="vh-stop vh-stop--last">
            <p class="vh-stop__time">
              <span class="vh-stop__day">{{ examDate }}</span>
              9:00
            </p>
            <div class="vh-stop__body">
              <h3 class="vh-stop__place">Matura. Stacja końcowa</h3>
              <p class="vh-stop__text">
                {{
                  tidy(
                    'Wysiadasz z zadaniami, które robiłeś już wiele razy, za każdym razem na innych liczbach.',
                  )
                }}
              </p>
              <RouterLink class="button" :to="{ name: 'register' }">
                Załóż konto
                <ArrowIcon />
              </RouterLink>
            </div>
          </li>
        </ol>
      </section>

      <section id="ludzie" class="vh-section vh-split" aria-labelledby="vh-crew-title">
        <div class="vh-split__head">
          <h2 id="vh-crew-title" class="vh-h2">{{ CREW_TITLE }}</h2>
          <p class="vh-lead">{{ CREW_INTRO }}</p>
        </div>
        <ul class="vh-crew">
          <li
            v-for="(role, index) in CREW"
            :key="role.what"
            v-reveal="index * 70"
            class="vh-role"
            :class="`vh-role--${role.who}`"
          >
            <span class="vh-role__icon"><WhoIcon :who="role.who" /></span>
            <div>
              <h3 class="vh-role__what">
                {{ role.what }}
                <span class="vh-role__who">{{ WHO_LABELS[role.who] }}</span>
              </h3>
              <p>{{ role.text }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section class="vh-section" aria-label="Zadanie na próbę">
        <TrialTask v-reveal class="vh-rise" />
      </section>

      <section class="vh-section" aria-labelledby="vh-voices-title">
        <h2 id="vh-voices-title" class="vh-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="vh-section" aria-labelledby="vh-founder-title">
        <h2 id="vh-founder-title" class="vh-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section id="bilety" class="vh-section vh-split" aria-labelledby="vh-tickets-title">
        <div class="vh-split__head">
          <h2 id="vh-tickets-title" class="vh-h2">Bilety</h2>
          <p class="vh-lead">
            {{
              tidy(
                'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
              )
            }}
          </p>
        </div>
        <ol class="vh-tickets">
          <li v-for="(exam, index) in EXAMS" :id="exam.id" :key="exam.id">
            <TicketCard
              :exam="exam"
              :valid-until="validUntil"
              :annual-months="annualMonths"
              :order="index"
            />
          </li>
        </ol>
      </section>

      <section class="vh-section vh-split" aria-labelledby="vh-faq-title">
        <div class="vh-split__head">
          <h2 id="vh-faq-title" class="vh-h2">Pytania</h2>
        </div>
        <FaqList />
      </section>
    </main>

    <footer class="vh-foot">
      <p>{{ PRODUCT_NAME }}, {{ year }}</p>
    </footer>
  </div>
</template>

<style scoped>
.vh {
  --ground: #e6ecf5;
  --surface: #ffffff;
  --card: #ffffff;
  --ink: #0f1f47;
  --ink-raised: #23366b;
  --ink-soft: #3d4a6b;
  --hairline: rgb(15 31 71 / 0.16);
  --signal: #f2541b;
  --signal-deep: #b93a0c;
  --duty: var(--signal-deep);
  --sign: var(--signal-deep);
  --radius: 0.9rem;
  --card-shadow: 0 1px 1px rgb(15 31 71 / 0.08), 0 14px 26px -14px rgb(15 31 71 / 0.3);
  --chat-task: #eef2f8;
  --chat-duty: #eef2f8;
  --display-stretch: 86%;
  --display-weight: 800;
  --pad: max(var(--gutter), calc((100vw - 80rem) / 2));
  background: var(--ground);
  color: var(--ink);
}

.vh ::selection {
  background: var(--ink);
  color: #fff;
}

.vh-top {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: var(--header-h);
  padding-inline: var(--pad);
  background: var(--ink);
  color: #fff;
}

.vh-top__mark {
  margin-right: auto;
  font-weight: 800;
  font-stretch: 86%;
  letter-spacing: 0.01em;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
}

.vh-top__nav {
  display: none;
  gap: 1.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
}

.vh-top__nav a {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  text-decoration: none;
}

.vh-top__nav a:hover {
  text-decoration: underline;
}

.vh-top__login {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 650;
  white-space: nowrap;
}

.vh-top :focus-visible {
  outline-color: #fff;
}

.vh-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.vh-hero {
  display: grid;
  gap: clamp(1.75rem, 1.25rem + 2.5vw, 3rem);
  padding: clamp(2rem, 1rem + 4.5vw, 5rem) var(--pad) clamp(2.5rem, 2rem + 3vw, 4.5rem);
}

.vh-hero__body {
  display: grid;
  gap: 1.1rem;
}

.vh-hero__title {
  max-width: 11ch;
  font-size: clamp(3.2rem, 1.4rem + 8.6vw, 8rem);
  font-weight: 800;
  font-stretch: 84%;
  letter-spacing: -0.03em;
  line-height: 0.9;
}

.vh-hero__lead {
  max-width: 42ch;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.4;
}

.vh-hero .vh-actions {
  margin-top: 0.4rem;
}

/* Tablica kierunków: biały arkusz z grubą belką, jak rozkład na peronie. */
.vh-lines {
  display: grid;
  align-self: end;
  padding: 0;
  border-top: 0.6rem solid var(--ink);
  border-radius: 0.3rem 0.3rem var(--radius) var(--radius);
  background: #fff;
  box-shadow: var(--card-shadow);
  list-style: none;
}

.vh-line {
  display: grid;
  grid-template-columns: 2.6rem minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: center;
  padding: 0.7rem 1rem;
}

.vh-line + .vh-line {
  border-top: 1px solid var(--hairline);
}

.vh-line__solid {
  width: 2.6rem;
  height: 2.6rem;
  color: var(--exam);
}

.vh-line__name {
  font-size: clamp(1.15rem, 1rem + 0.8vw, 1.6rem);
  font-weight: 780;
  font-stretch: 86%;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.vh-line__platform {
  color: var(--ink-soft);
  font-size: 0.875rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.vh-sheet {
  display: grid;
  gap: clamp(1.5rem, 1rem + 2vw, 2.5rem);
  margin-inline: max(0rem, calc(var(--pad) - 1.5rem));
  padding: clamp(1.75rem, 1rem + 3vw, 3.5rem) clamp(1rem, 0.5rem + 2.5vw, 3rem);
  border-top: 0.75rem solid var(--signal);
  border-radius: 0.3rem 0.3rem 1.5rem 1.5rem;
  background: #fff;
  box-shadow: var(--card-shadow);
  scroll-margin-top: calc(var(--header-h) + 0.75rem);
}

.vh-sheet__title {
  font-size: clamp(1.8rem, 1.3rem + 2.4vw, 3.25rem);
  font-weight: 800;
  font-stretch: 84%;
  letter-spacing: -0.015em;
  line-height: 1;
  text-transform: uppercase;
}

.vh-stops {
  display: grid;
  padding: 0;
  list-style: none;
}

.vh-stop {
  display: grid;
  gap: 0.5rem;
  padding-block: clamp(1.25rem, 1rem + 1.5vw, 2.25rem);
  border-top: 2px solid var(--ink);
}

/* Godzina to największy element wiersza, tak jak na prawdziwym rozkładzie. */
.vh-stop__time {
  font-size: clamp(3rem, 1.8rem + 6vw, 6.5rem);
  font-weight: 800;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 0.9;
  transition: clip-path 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  clip-path: inset(-5% 0 -5% 0);
}

.vh-stop.is-waiting .vh-stop__time {
  clip-path: inset(-5% 100% -5% 0);
}

.vh-stop__day {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--signal-deep);
  font-size: 0.9375rem;
  font-stretch: 100%;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
}

.vh-stop__body {
  display: grid;
  gap: 0.6rem;
  justify-items: start;
  transition:
    opacity 0.6s ease 0.15s,
    translate 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s;
}

.vh-stop.is-waiting .vh-stop__body {
  opacity: 0;
  translate: 0 1.25rem;
}

.vh-stop__place {
  font-size: clamp(1.5rem, 1.2rem + 1.6vw, 2.4rem);
  font-weight: 800;
  font-stretch: 86%;
  letter-spacing: -0.015em;
  line-height: 1.05;
}

.vh-stop__text {
  max-width: 50ch;
  color: var(--ink-soft);
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.vh-repeats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.4rem;
  padding: 0;
  list-style: none;
}

.vh-repeats__task {
  display: grid;
  padding: 0.5rem 0.9rem 0.6rem;
  border: 2px solid var(--ink);
  border-radius: 0.7rem;
  font-size: 1.15rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.vh-repeats__when {
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.vh-stop__chat {
  justify-self: stretch;
  max-width: 30rem;
  margin-top: 0.5rem;
  border: 2px solid var(--ink);
}

.vh-stop--last {
  border-top-width: 0.5rem;
  border-top-color: var(--signal);
}

.vh-stop--last .button {
  margin-top: 0.6rem;
}

.vh-section {
  display: grid;
  gap: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
  padding: clamp(3.5rem, 2.5rem + 5vw, 7rem) var(--pad);
  scroll-margin-top: var(--header-h);
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 46rem;
}

.vh-section + .vh-section {
  border-top: 2px solid var(--ink);
}

.vh-h2 {
  max-width: 14ch;
  font-size: clamp(2.2rem, 1.5rem + 3.8vw, 4.75rem);
  font-weight: 800;
  font-stretch: 84%;
  letter-spacing: -0.02em;
  line-height: 0.95;
}

.vh-lead {
  max-width: 44ch;
  margin-top: 1.1rem;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.45;
}

.vh-crew {
  display: grid;
  padding: 0;
  border-bottom: 1px solid var(--hairline);
  list-style: none;
}

.vh-role {
  display: flex;
  gap: 1rem;
  padding-block: 1.1rem;
  border-top: 1px solid var(--hairline);
  transition:
    opacity 0.6s ease var(--reveal-delay, 0ms),
    translate 0.8s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.vh-role.is-waiting {
  opacity: 0;
  translate: 0 1.25rem;
}

.vh-role__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.6rem;
  background: var(--ink);
  color: #fff;
  font-size: 1.35rem;
}

.vh-role--duty .vh-role__icon {
  background: var(--signal);
  color: var(--ink);
}

.vh-role__what {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.75rem;
  margin-bottom: 0.3rem;
  font-size: clamp(1.25rem, 1.1rem + 0.7vw, 1.6rem);
  font-weight: 780;
  font-stretch: 90%;
  line-height: 1.15;
}

.vh-role__who {
  color: var(--ink-soft);
  font-size: 0.9375rem;
  font-weight: 700;
  font-stretch: 100%;
}

.vh-role--duty .vh-role__who {
  color: var(--signal-deep);
}

.vh-role p {
  max-width: 46ch;
  color: var(--ink-soft);
}

.vh-rise {
  transition:
    opacity 0.7s ease,
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.vh-rise.is-waiting {
  opacity: 0;
  translate: 0 1.75rem;
}

.vh-tickets {
  display: grid;
  gap: 1.25rem;
  padding: 0;
  list-style: none;
}

.vh-tickets li {
  scroll-margin-top: calc(var(--header-h) + 1rem);
}

.vh-foot {
  padding: 1.75rem var(--pad) 2.25rem;
  background: var(--ink);
  color: #fff;
  font-size: 0.9375rem;
}

@media (min-width: 44rem) {
  .vh-top__nav {
    display: flex;
  }

  .vh-top__login {
    margin-left: 0.5rem;
  }

  .vh-stop {
    grid-template-columns: minmax(11rem, 3fr) minmax(0, 7fr);
    gap: 1.5rem clamp(1.5rem, 4vw, 4rem);
    align-items: start;
  }
}

@media (min-width: 60rem) {
  .vh-hero {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    align-items: end;
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .vh-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }

  .vh-split__head {
    position: sticky;
    top: calc(var(--header-h) + 2rem);
  }
}
</style>
