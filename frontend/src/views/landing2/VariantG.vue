<script setup lang="ts">
import { EXAMS } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { AUDIENCE, MAP_ROUTES, tidy, type Who } from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import { vReveal } from '@/landing2/reveal'
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

const { year, cheapest, annualMonths, validUntil } = useOffer()

// Trzy zdania zamiast listy stanowisk: co właśnie zobaczył ktoś, kto policzył zadanie na górze.
const FACTS: { who: Who; title: string; text: string }[] = [
  {
    who: 'human',
    title: 'Zadanie ułożył człowiek.',
    text: tidy(
      'Każde zadanie i zasady jego oceniania układa i sprawdza człowiek. Żadnego nie wymyśla AI.',
    ),
  },
  {
    who: 'program',
    title: 'Wynik sprawdził program.',
    text: tidy(
      'Program porównuje twoją odpowiedź z kluczem, także gdy jest nią wyrażenie. Niczego nie zgaduje.',
    ),
  },
  {
    who: 'duty',
    title: 'Gdy utkniesz, pomaga Dyżurny.',
    text: tidy(
      'To jedyne miejsce, w którym jest AI. Dyżurny odpowiada na pytania i podpowiada następny krok. Nie rozwiązuje zadania za ciebie.',
    ),
  },
]
</script>

<template>
  <div class="vg">
    <header class="vg-top">
      <a class="vg-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <a class="vg-top__link" href="#bilety">Bilety</a>
      <RouterLink class="vg-top__link" :to="{ name: 'login' }">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="vg-hero" aria-labelledby="vg-title">
        <div class="vg-hero__solid" aria-hidden="true">
          <SolidFigure kind="tetrahedron" :spin="0.16" :fill="0.9" :weight="0.012" />
        </div>
        <h1 id="vg-title" class="vg-hero__title">
          Zanim cokolwiek przeczytasz, policz jedno zadanie.
        </h1>
        <TrialTask class="vg-hero__task" />
        <p class="vg-hero__note">
          {{ tidy('Tak wygląda nauka w aplikacji: ten sam typ zadania wraca z innymi liczbami.') }}
          {{ AUDIENCE }}
        </p>
      </section>

      <section id="ludzie" class="vg-facts" aria-label="Kto co robi">
        <article
          v-for="fact in FACTS"
          :key="fact.who"
          v-reveal
          class="vg-fact"
          :class="`vg-fact--${fact.who}`"
        >
          <WhoIcon class="vg-fact__icon" :who="fact.who" />
          <h2 class="vg-fact__title">{{ fact.title }}</h2>
          <p class="vg-fact__text">{{ fact.text }}</p>
          <DutyChat v-if="fact.who === 'duty'" class="vg-fact__chat" />
        </article>
      </section>

      <section id="jak-to-dziala" class="vg-section vg-split" aria-labelledby="vg-steps-title">
        <h2 id="vg-steps-title" class="vg-h2">Od pierwszego zadania do egzaminu</h2>
        <StepList />
      </section>

      <section class="vg-section" aria-labelledby="vg-exams-title">
        <h2 id="vg-exams-title" class="vg-h2">Trzy egzaminy</h2>
        <ul class="vg-exams">
          <li v-for="exam in EXAMS" :id="exam.id" :key="exam.id" v-reveal class="vg-exam">
            <div class="vg-exam__solid" aria-hidden="true">
              <SolidFigure :kind="exam.solid" :fill="0.8" :weight="0.04" />
            </div>
            <div class="vg-exam__body">
              <h3 class="vg-exam__name">{{ exam.name }}</h3>
              <p>{{ tidy(exam.description) }}</p>
            </div>
            <div class="vg-exam__side">
              <p class="vg-exam__price">od {{ formatPrice(exam.prices.monthly) }}</p>
              <RouterLink
                v-if="MAP_ROUTES[exam.id]"
                class="vg-more"
                :to="{ name: MAP_ROUTES[exam.id] }"
              >
                Mapa tematów
                <ArrowIcon />
              </RouterLink>
            </div>
          </li>
        </ul>
      </section>

      <section class="vg-section" aria-labelledby="vg-voices-title">
        <h2 id="vg-voices-title" class="vg-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="vg-section" aria-labelledby="vg-founder-title">
        <h2 id="vg-founder-title" class="vg-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section id="bilety" class="vg-section vg-split" aria-labelledby="vg-tickets-title">
        <div>
          <h2 id="vg-tickets-title" class="vg-h2">Bilety</h2>
          <p class="vg-lead">
            {{
              tidy(
                'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
              )
            }}
          </p>
        </div>
        <ol class="vg-tickets">
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

      <section class="vg-section vg-split" aria-labelledby="vg-faq-title">
        <h2 id="vg-faq-title" class="vg-h2">Pytania</h2>
        <FaqList />
      </section>

      <section class="vg-end" aria-labelledby="vg-end-title">
        <h2 id="vg-end-title" class="vg-end__title">
          Jedno zadanie masz za sobą. Reszta czeka w aplikacji.
        </h2>
        <div class="vg-end__actions">
          <RouterLink class="button" :to="{ name: 'register' }">
            Załóż konto
            <ArrowIcon />
          </RouterLink>
          <a v-if="cheapest" class="vg-more" href="#bilety">
            Bilety już od {{ formatPrice(cheapest.price) }}
          </a>
        </div>
      </section>
    </main>

    <footer class="vg-foot">
      <p>{{ PRODUCT_NAME }}, {{ year }}</p>
    </footer>
  </div>
</template>

<style scoped>
.vg {
  --ground: #ffffff;
  --surface: #ffffff;
  --card: #ffffff;
  --ink: #111214;
  --ink-raised: #2b2d31;
  --ink-soft: #55585e;
  --hairline: rgb(17 18 20 / 0.14);
  --duty: #126b38;
  --sign: #111214;
  --radius: 1.5rem;
  --chat-task: #f3f3f1;
  --chat-duty: #f3f3f1;
  --display-stretch: 100%;
  --display-weight: 680;
  --pad: max(var(--gutter), calc((100vw - 76rem) / 2));
  background: #fff;
  color: var(--ink);
}

.vg ::selection {
  background: var(--ink);
  color: #fff;
}

.vg-top {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  height: 4rem;
  padding-inline: var(--pad);
}

.vg-top__mark {
  margin-right: auto;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.vg-top__link {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
}

.vg-top__link:hover {
  text-decoration: underline;
}

.vg-more {
  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  min-height: 2.75rem;
  font-weight: 650;
}

.vg-more:hover {
  --nudge: 0.2em;
  text-decoration-thickness: 2px;
}

.vg-hero {
  position: relative;
  display: grid;
  gap: clamp(1.75rem, 1.25rem + 2.5vw, 3rem);
  padding: clamp(2rem, 1rem + 5vw, 6rem) var(--pad) clamp(3rem, 2rem + 5vw, 6rem);
  overflow: clip;
}

/* Jedna wielka bryła cienką kreską, wycięta krawędzią ekranu. */
.vg-hero__solid {
  position: absolute;
  top: 2.5rem;
  right: -24vw;
  width: min(72vw, 46rem);
  aspect-ratio: 1;
  color: #111214;
  opacity: 0.16;
  pointer-events: none;
}

.vg-hero__title {
  position: relative;
  max-width: 15ch;
  font-size: clamp(2.6rem, 1.4rem + 6.2vw, 6.25rem);
  font-weight: 680;
  letter-spacing: -0.045em;
  line-height: 0.96;
}

.vg-hero__task {
  position: relative;
  border: 1.5px solid var(--ink);
}

.vg-hero__note {
  position: relative;
  max-width: 52ch;
  color: var(--ink-soft);
}

.vg-facts {
  display: grid;
  border-top: 1.5px solid var(--ink);
}

.vg-fact {
  display: grid;
  gap: 0.9rem;
  padding: clamp(2.5rem, 2rem + 4vw, 5.5rem) var(--pad);
  border-bottom: 1px solid var(--hairline);
  transition:
    opacity 0.7s ease,
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.vg-fact.is-waiting {
  opacity: 0;
  translate: 0 2rem;
}

.vg-fact__icon {
  font-size: clamp(2rem, 1.6rem + 1.6vw, 3rem);
}

.vg-fact--duty .vg-fact__icon {
  color: var(--duty);
}

.vg-fact__title {
  max-width: 14ch;
  font-size: clamp(2.3rem, 1.4rem + 4.8vw, 5.25rem);
  font-weight: 680;
  letter-spacing: -0.045em;
  line-height: 0.98;
}

.vg-fact__text {
  max-width: 40ch;
  color: var(--ink-soft);
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.45;
}

.vg-fact__chat {
  margin-top: 0.75rem;
  border: 1.5px solid var(--ink);
}

.vg-section {
  display: grid;
  gap: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
  padding: clamp(3.5rem, 2.5rem + 5vw, 7rem) var(--pad);
  border-bottom: 1px solid var(--hairline);
  scroll-margin-top: 1rem;
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 46rem;
}

.vg-h2 {
  max-width: 14ch;
  font-size: clamp(2.1rem, 1.5rem + 3.2vw, 4rem);
  font-weight: 680;
  letter-spacing: -0.04em;
  line-height: 1;
}

.vg-lead {
  max-width: 40ch;
  margin-top: 1.1rem;
  color: var(--ink-soft);
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.3rem);
}

.vg-exams {
  display: grid;
  padding: 0;
  border-top: 1px solid var(--hairline);
  list-style: none;
}

.vg-exam {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: 0.75rem 1.1rem;
  align-items: center;
  padding-block: 1.5rem;
  border-bottom: 1px solid var(--hairline);
  scroll-margin-top: 1rem;
  transition:
    opacity 0.6s ease,
    translate 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.vg-exam.is-waiting {
  opacity: 0;
  translate: 0 1.25rem;
}

.vg-exam__solid {
  aspect-ratio: 1;
  color: var(--ink);
}

.vg-exam__name {
  margin-bottom: 0.3rem;
  font-size: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem);
  font-weight: 680;
  letter-spacing: -0.035em;
  line-height: 1.02;
}

.vg-exam__body p {
  max-width: 48ch;
  color: var(--ink-soft);
}

.vg-exam__side {
  display: flex;
  flex-wrap: wrap;
  grid-column: 2;
  align-items: center;
  gap: 0.25rem 1.5rem;
}

.vg-exam__price {
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.vg-tickets {
  display: grid;
  gap: 1.25rem;
  padding: 0;
  list-style: none;
}

/* Bilety na białym tle potrzebują obrysu, bo sam cień ich nie odcina. */
.vg-tickets :deep(.ticket__paper) {
  outline: 1.5px solid var(--ink);
  outline-offset: -1.5px;
}

.vg-end {
  display: grid;
  gap: 1.75rem;
  padding: clamp(4rem, 3rem + 6vw, 9rem) var(--pad);
}

.vg-end__title {
  max-width: 16ch;
  font-size: clamp(2.4rem, 1.4rem + 5vw, 5.5rem);
  font-weight: 680;
  letter-spacing: -0.045em;
  line-height: 0.98;
}

.vg-end__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
}

.vg-foot {
  padding: 1.75rem var(--pad) 2.25rem;
  border-top: 1px solid var(--hairline);
  color: var(--ink-soft);
  font-size: 0.9375rem;
}

@media (min-width: 44rem) {
  .vg-exam {
    grid-template-columns: 6.5rem minmax(0, 1fr) auto;
    column-gap: 2rem;
  }

  .vg-exam__side {
    grid-column: auto;
    flex-direction: column;
    align-items: flex-end;
  }
}

@media (min-width: 60rem) {
  .vg-hero {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: end;
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .vg-hero__solid {
    top: -22%;
    right: -12%;
    width: 46rem;
  }

  .vg-hero__task {
    grid-row: span 2;
    /* W wąskiej kolumnie zadanie zostaje w jednym słupku. */
    grid-template-columns: none;
  }

  .vg-fact {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    column-gap: clamp(2rem, 5vw, 5rem);
    align-items: start;
  }

  .vg-fact__icon,
  .vg-fact__title {
    grid-column: 1;
  }

  .vg-fact__text {
    grid-row: 2;
    grid-column: 2;
    align-self: end;
  }

  .vg-fact__chat {
    grid-row: 3;
    grid-column: 2;
  }

  .vg-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }
}
</style>
