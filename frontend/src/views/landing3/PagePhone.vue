<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { EXAMS } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { daysToExam } from '@/landing2/content'
import { useOffer } from '@/landing2/offer'
import { usePageGround } from '@/landing2/pageGround'
import { vReveal } from '@/landing2/reveal'
import { CREW, CREW_TITLE, FAQ, LEAD, LEAD_TEXT, TICKETS_TEXT } from '@/landing3/content'
import { BASIC_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS } from '@/maps/basic/demoProgress'
import type { MapProgress, TopicMap } from '@/maps/types'
import { plural } from '@/utils/plural'
import ArrowIcon from '@/components/landing/ArrowIcon.vue'
import DutyChat from '@/components/landing2/DutyChat.vue'
import FounderSlot from '@/components/landing2/FounderSlot.vue'
import OpinionList from '@/components/landing2/OpinionList.vue'
import FaqList from '@/components/landing3/FaqList.vue'
import TicketPrinter from '@/components/landing3/TicketPrinter.vue'
import TrialTask from '@/components/landing3/TrialTask.vue'
import WhoIcon from '@/components/landing3/WhoIcon.vue'
import MetroMap from '@/components/map/MetroMap.vue'

// Strona prowadzi przez aplikację ekran po ekranie: w ramkach telefonu są prawdziwa mapa,
// zadanie do policzenia i rozmowa z Dyżurnym.
const router = useRouter()
const { today, year } = useOffer()

usePageGround('#d9efe2')

const map: TopicMap = BASIC_MAP
const progress: MapProgress<string> = BASIC_DEMO_PROGRESS
const selected = ref<string>()

// Przykładowa lista powtórek na jeden dzień, żeby pokazać trzeci ekran aplikacji.
const REVIEWS = [
  { topic: 'Logarytmy', tasks: 2, when: 'wraca po 3 dniach' },
  { topic: 'Potęgi', tasks: 1, when: 'wraca po tygodniu' },
  { topic: 'Funkcja liniowa', tasks: 3, when: 'wraca po 2 dniach' },
  { topic: 'Procenty', tasks: 1, when: 'wraca po 2 tygodniach' },
]

function daysLeft(exam: (typeof EXAMS)[number]): string {
  const days = daysToExam(exam.id, today)
  return `${days} ${plural(days, ['dzień', 'dni', 'dni'])}`
}
</script>

<template>
  <div class="ph">
    <header class="ph-top">
      <a class="ph-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <RouterLink class="ph-top__login" :to="{ name: 'login' }">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="ph-hero" aria-labelledby="ph-title">
        <div class="ph-hero__body">
          <h1 id="ph-title" class="ph-hero__title">Matura z matmy, stacja po stacji</h1>
          <p class="ph-hero__lead">{{ LEAD }} {{ LEAD_TEXT }}</p>
          <div class="ph-actions">
            <RouterLink class="button" :to="{ name: 'register' }">
              Załóż konto
              <ArrowIcon />
            </RouterLink>
            <a class="button button--quiet" href="#bilety">Zobacz bilety</a>
          </div>
          <ul class="ph-exams">
            <li
              v-for="exam in EXAMS"
              :key="exam.id"
              :style="{ '--exam': `var(--exam-${exam.id})` }"
            >
              <strong>{{ exam.name }}</strong>
              <span>za {{ daysLeft(exam) }}</span>
            </li>
          </ul>
        </div>
        <div class="ph-phone ph-phone--map">
          <p class="ph-phone__bar">Matura podstawowa</p>
          <div class="ph-phone__screen">
            <MetroMap
              :map="map"
              :progress="progress"
              orientation="portrait"
              :selected="selected"
              @select="selected = $event"
            />
          </div>
        </div>
      </section>

      <section class="ph-step ph-step--sky" aria-labelledby="ph-task-title">
        <div class="ph-step__body">
          <h2 id="ph-task-title" class="ph-h2">Liczysz w zeszycie, wynik wpisujesz tutaj</h2>
          <p class="ph-lead">
            Spróbuj od razu. To typ zadania z arkusza CKE, a po każdym wyniku możesz wylosować nowe
            liczby.
          </p>
        </div>
        <div v-reveal class="ph-phone ph-phone--tall">
          <p class="ph-phone__bar">Logarytmy</p>
          <div class="ph-phone__screen ph-phone__screen--scroll">
            <TrialTask class="ph-embed" />
          </div>
        </div>
      </section>

      <section class="ph-step ph-step--peach ph-step--flip" aria-labelledby="ph-duty-title">
        <div class="ph-step__body">
          <h2 id="ph-duty-title" class="ph-h2">Utkniesz? Pytasz Dyżurnego</h2>
          <p class="ph-lead">
            Dyżurny to AI, które podpowiada następny krok. Wynik zawsze sprawdza program.
          </p>
        </div>
        <div v-reveal class="ph-phone ph-phone--tall">
          <p class="ph-phone__bar">Dyżurny</p>
          <div class="ph-phone__screen ph-phone__screen--scroll">
            <DutyChat class="ph-embed" />
          </div>
        </div>
      </section>

      <section class="ph-step ph-step--lemon" aria-labelledby="ph-reviews-title">
        <div class="ph-step__body">
          <h2 id="ph-reviews-title" class="ph-h2">Codziennie kilka zadań, zanim zapomnisz</h2>
          <p class="ph-lead">
            Aplikacja sama wylicza, kiedy wrócić do każdego typu zadania. Ty tylko otwierasz
            powtórki na dziś.
          </p>
        </div>
        <div v-reveal class="ph-phone">
          <p class="ph-phone__bar">Powtórki na dziś</p>
          <ul class="ph-reviews">
            <li v-for="item in REVIEWS" :key="item.topic">
              <strong>{{ item.topic }}</strong>
              <span>
                {{ item.tasks }} {{ plural(item.tasks, ['zadanie', 'zadania', 'zadań']) }} ·
                {{ item.when }}
              </span>
            </li>
          </ul>
          <p class="ph-reviews__note">Przykładowy dzień ucznia</p>
        </div>
      </section>

      <section class="ph-section" aria-labelledby="ph-crew-title">
        <h2 id="ph-crew-title" class="ph-h2">{{ CREW_TITLE }}</h2>
        <ul class="ph-crew">
          <li v-for="role in CREW" :key="role.what" class="ph-role">
            <span class="ph-role__icon"><WhoIcon :who="role.who" /></span>
            <h3 class="ph-role__what">{{ role.what }}</h3>
            <p class="ph-role__who">{{ role.label }}</p>
            <p>{{ role.text }}</p>
          </li>
        </ul>
      </section>

      <section class="ph-section" aria-labelledby="ph-voices-title">
        <h2 id="ph-voices-title" class="ph-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section class="ph-section" aria-labelledby="ph-founder-title">
        <h2 id="ph-founder-title" class="ph-h2">Kto za tym stoi</h2>
        <FounderSlot />
      </section>

      <section
        id="bilety"
        class="ph-section ph-split ph-tickets"
        aria-labelledby="ph-tickets-title"
      >
        <div class="ph-head">
          <h2 id="ph-tickets-title" class="ph-h2">Bilety</h2>
          <p class="ph-lead">{{ TICKETS_TEXT }}</p>
        </div>
        <TicketPrinter @taken="router.push({ name: 'coming-soon' })" />
      </section>

      <section class="ph-section ph-split" aria-labelledby="ph-faq-title">
        <div class="ph-head">
          <h2 id="ph-faq-title" class="ph-h2">Pytania</h2>
        </div>
        <FaqList :items="FAQ" />
      </section>
    </main>

    <footer class="ph-foot">
      <p>{{ PRODUCT_NAME }}, {{ year }}</p>
      <RouterLink class="button" :to="{ name: 'register' }">
        Załóż konto
        <ArrowIcon />
      </RouterLink>
    </footer>
  </div>
</template>

<style scoped>
.ph {
  --ground: #f6f7f2;
  --surface: #fff;
  --card: #fff;
  --ink: #17181a;
  --ink-raised: #2f3236;
  --ink-soft: #4c5057;
  --hairline: rgb(23 24 26 / 0.14);
  --mint: #d9efe2;
  --sky: #dbe7fb;
  --peach: #fde3d3;
  --lemon: #fbf0c4;
  --duty: #2a66d6;
  --sign: var(--ink);
  --radius: 1.5rem;
  --card-shadow: 0 1px 1px rgb(23 24 26 / 0.06), 0 14px 26px -14px rgb(23 24 26 / 0.25);
  --display-stretch: 100%;
  --display-weight: 800;
  --pad: max(var(--gutter), calc((100vw - 68rem) / 2));
  background: var(--ground);
  color: var(--ink);
  overflow: clip;
}

.ph-top {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-h);
  padding-inline: var(--pad);
  background: var(--mint);
}

.ph-top__mark {
  font-weight: 800;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.ph-top__login {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 650;
}

.ph-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.ph-hero {
  display: grid;
  gap: 2rem;
  padding: clamp(1.5rem, 1rem + 3vw, 4rem) var(--pad) clamp(2.5rem, 2rem + 3vw, 4.5rem);
  background: var(--mint);
}

.ph-hero__body {
  display: grid;
  gap: 1.1rem;
  align-content: center;
  justify-items: start;
}

.ph-hero__title {
  max-width: 13ch;
  font-size: clamp(2.7rem, 1.6rem + 5.6vw, 5.25rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.98;
  text-wrap: balance;
}

.ph-hero__lead {
  max-width: 44ch;
  font-size: clamp(1.0625rem, 1rem + 0.45vw, 1.3rem);
  line-height: 1.45;
}

.ph-exams {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0;
  list-style: none;
}

.ph-exams li {
  display: grid;
  padding: 0.5rem 0.9rem 0.55rem;
  border-radius: 1rem;
  background: #fff;
  font-size: 0.9375rem;
  line-height: 1.2;
}

.ph-exams strong {
  color: color-mix(in srgb, var(--exam) 80%, #000);
  font-weight: 750;
}

.ph-exams span {
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

/* Ramka telefonu: ciemny brzeg, zaokrąglone rogi i ekran z treścią aplikacji. */
.ph-phone {
  display: flex;
  flex-direction: column;
  width: min(100%, 21.5rem);
  margin-inline: auto;
  border: 0.55rem solid #17181a;
  border-radius: 2.4rem;
  background: var(--ground);
  box-shadow:
    0 2px 3px rgb(23 24 26 / 0.2),
    0 34px 50px -28px rgb(23 24 26 / 0.5);
  overflow: hidden;
}

.ph-phone--map {
  height: min(34rem, 74svh);
}

.ph-phone--tall {
  max-height: 34rem;
}

.ph-phone__bar {
  flex: none;
  padding: 0.85rem 1.1rem 0.7rem;
  background: #17181a;
  color: #fff;
  font-weight: 750;
}

.ph-phone__screen {
  flex: 1;
  min-height: 0;
}

.ph-phone__screen--scroll {
  overflow-y: auto;
}

/* Wstawiony komponent wypełnia ekran telefonu, bez własnej karty i cienia. */
.ph-embed {
  --radius: 0;
  border-radius: 0;
  box-shadow: none;
}

.ph-step {
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 44rem;
  display: grid;
  gap: 1.75rem;
  align-items: center;
  padding: clamp(2.5rem, 2rem + 3vw, 4.5rem) var(--pad);
}

.ph-step--sky {
  background: var(--sky);
}

.ph-step--peach {
  background: var(--peach);
}

.ph-step--lemon {
  background: var(--lemon);
}

.ph-step__body,
.ph-head {
  display: grid;
  gap: 0.9rem;
  align-content: start;
}

.ph-h2 {
  max-width: 18ch;
  font-size: clamp(1.9rem, 1.5rem + 2.2vw, 3.1rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.04;
  text-wrap: balance;
}

.ph-lead {
  max-width: 44ch;
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.ph-reviews {
  display: grid;
  padding: 0.4rem 1.1rem 0;
  list-style: none;
}

.ph-reviews li {
  display: grid;
  gap: 0.1rem;
  padding-block: 0.8rem;
  border-bottom: 1px solid var(--hairline);
}

.ph-reviews strong {
  font-size: 1.1rem;
  font-weight: 750;
}

.ph-reviews span {
  color: var(--ink-soft);
  font-size: 0.9375rem;
}

.ph-reviews__note {
  padding: 0.8rem 1.1rem 1.1rem;
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.ph-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 40rem;
  display: grid;
  gap: clamp(1.5rem, 1.2rem + 1.6vw, 2.5rem);
  padding: clamp(2.5rem, 2rem + 3vw, 4.5rem) var(--pad);
  scroll-margin-top: var(--header-h);
}

.ph-crew {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: 1.5rem 2rem;
  padding: 0;
  list-style: none;
}

.ph-role {
  display: grid;
  gap: 0.25rem;
  align-content: start;
}

.ph-role p {
  color: var(--ink-soft);
}

.ph-role__icon {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: 0.4rem;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  font-size: 1.35rem;
}

.ph-role__what {
  font-size: 1.3rem;
  font-weight: 780;
  letter-spacing: -0.015em;
}

.ph-role .ph-role__who {
  color: var(--ink);
  font-size: 0.9375rem;
  font-weight: 700;
}

/* Sekcja z kasownikiem nie może przycinać swojej zawartości, bo zabrany bilet opuszcza ją dołem. */
.ph-tickets {
  --tp-body: #17181a;
  content-visibility: visible;
  position: relative;
  z-index: 3;
  background: var(--mint);
}

.ph-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem var(--pad) 2.5rem;
  color: var(--ink-soft);
}

.ph .ph-phone {
  transition:
    opacity 0.7s ease,
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.ph .ph-phone.is-waiting {
  opacity: 0;
  translate: 0 2rem;
}

@media (min-width: 56rem) {
  .ph-hero,
  .ph-step {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    column-gap: clamp(2rem, 5vw, 5rem);
  }

  .ph-step--flip .ph-step__body {
    grid-column: 2;
    grid-row: 1;
  }

  .ph-step--flip .ph-phone {
    grid-column: 1;
    grid-row: 1;
  }

  .ph-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }
}
</style>
