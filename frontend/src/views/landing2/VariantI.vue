<script setup lang="ts">
import '@fontsource/caveat/latin-400.css'
import '@fontsource/caveat/latin-ext-400.css'
import { EXAMS } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { FOUNDER, tidy } from '@/landing2/content'
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
import TrialTask from '@/components/landing2/TrialTask.vue'

const { today, year, cheapest, annualMonths, validUntil } = useOffer()

const written = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(today)
</script>

<template>
  <div class="vi">
    <header class="vi-top">
      <a class="vi-top__mark" href="#start">{{ PRODUCT_NAME }}</a>
      <a class="vi-top__link" href="#bilety">Bilety</a>
      <RouterLink class="vi-top__link" :to="{ name: 'login' }">Zaloguj się</RouterLink>
    </header>

    <main>
      <section id="start" class="vi-hero" aria-labelledby="vi-title">
        <h1 id="vi-title" class="vi-hero__title">Ten kurs napisał człowiek.</h1>
        <p class="vi-hero__lead">
          {{
            tidy(
              'Matura z matematyki i egzamin ósmoklasisty. Poniżej list od osoby, która za to odpowiada.',
            )
          }}
        </p>
      </section>

      <!-- Treść listu to szkic w imieniu założyciela, do przepisania jego słowami. -->
      <article class="vi-letter" aria-label="List od założyciela">
        <header class="vi-letter__head">
          <span class="vi-letter__photo" role="img" :aria-label="FOUNDER.photoHint">zdjęcie</span>
          <p class="vi-letter__from">
            <strong>{{ FOUNDER.name }}</strong>
            <span>{{ PRODUCT_NAME }}, {{ written }}</span>
          </p>
        </header>

        <div class="vi-letter__text">
          <p class="vi-letter__hello">Cześć,</p>
          <p v-reveal>
            {{
              tidy(
                'uczę matematyki i ciągle widzę to samo. Uczeń robi zadanie, zagląda do odpowiedzi, kiwa głową. Tydzień później nie wie, jak je zacząć.',
              )
            }}
          </p>
          <div v-reveal class="vi-letter__row">
            <p>
              {{
                tidy('To nie jest wina ucznia. Zapamiętał odpowiedź, a nie sposób. Dlatego tutaj')
              }}
              <span class="vi-pen">{{ tidy('każde zadanie wraca z innymi liczbami') }}</span
              >{{ tidy('. Odpowiedzi nie da się zapamiętać, więc zostaje metoda.') }}
            </p>
            <p class="vi-note">nowe liczby przy każdej powtórce</p>
          </div>
          <div v-reveal class="vi-letter__row">
            <p>
              {{
                tidy(
                  'Wiem, że kurs da się dziś wygenerować w jedno popołudnie. Ten powstaje inaczej.',
                )
              }}
              <span class="vi-pen">{{ tidy('Zadania układa i sprawdza człowiek.') }}</span>
              {{
                tidy(
                  'Zasady oceniania są przepisane z dokumentów CKE i sprawdzone ręcznie. Wynik liczy program, który niczego nie zgaduje.',
                )
              }}
            </p>
            <p class="vi-note">tu nie ma AI</p>
          </div>
          <div v-reveal class="vi-letter__row">
            <p>
              {{ tidy('AI ma u nas jedno zajęcie. Nazywa się Dyżurny i') }}
              <span class="vi-pen">{{ tidy('odpowiada na pytania, kiedy utkniesz') }}</span
              >{{ tidy('. Nie rozwiąże zadania za ciebie, podpowie następny krok.') }}
            </p>
            <p class="vi-note">a tu jest, i tylko tu</p>
          </div>
          <p v-reveal>
            {{
              tidy(
                'Nie musisz mi wierzyć na słowo. Niżej jest jedno zadanie: policz je, bez zakładania konta.',
              )
            }}
          </p>
          <p class="vi-letter__sign">{{ FOUNDER.name }}</p>
          <p v-if="cheapest" class="vi-letter__ps">
            PS. Bilety są od {{ formatPrice(cheapest.price) }} miesięcznie, a roczny wychodzi
            taniej.
            <a href="#bilety">Zobacz bilety</a>
          </p>
        </div>

        <ul class="vi-letter__exams" aria-label="Egzaminy">
          <li
            v-for="exam in EXAMS"
            :key="exam.id"
            class="vi-exam"
            :style="{ '--exam': `var(--exam-${exam.id})` }"
          >
            <span class="vi-exam__solid" aria-hidden="true">
              <SolidFigure :kind="exam.solid" :fill="0.86" :weight="0.065" />
            </span>
            {{ exam.name }}
          </li>
        </ul>
      </article>

      <section class="vi-section" aria-label="Zadanie na próbę">
        <TrialTask v-reveal class="vi-rise" />
      </section>

      <section id="ludzie" class="vi-section vi-split" aria-labelledby="vi-duty-title">
        <div>
          <h2 id="vi-duty-title" class="vi-h2">A to jedyne miejsce z AI</h2>
          <p class="vi-lead">
            {{
              tidy(
                'Dyżurny odpowiada na pytania przy zadaniu. Naprowadza, a wynik i tak sprawdza program.',
              )
            }}
          </p>
        </div>
        <DutyChat v-reveal class="vi-rise" />
      </section>

      <section class="vi-section" aria-labelledby="vi-founder-title">
        <h2 id="vi-founder-title" class="vi-h2">To samo w nagraniu</h2>
        <FounderSlot />
      </section>

      <section class="vi-section" aria-labelledby="vi-voices-title">
        <h2 id="vi-voices-title" class="vi-h2">Co mówią uczniowie i rodzice</h2>
        <OpinionList />
      </section>

      <section id="bilety" class="vi-section vi-split" aria-labelledby="vi-tickets-title">
        <div>
          <h2 id="vi-tickets-title" class="vi-h2">Bilety</h2>
          <p class="vi-lead">
            {{
              tidy(
                'Bilet miesięczny przedłużasz co miesiąc. Roczny kupujesz raz i działa do końca sierpnia po egzaminie.',
              )
            }}
          </p>
        </div>
        <ol class="vi-tickets">
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

      <section class="vi-section vi-split" aria-labelledby="vi-faq-title">
        <h2 id="vi-faq-title" class="vi-h2">Pytania</h2>
        <FaqList />
      </section>
    </main>

    <footer class="vi-foot">
      <p>{{ PRODUCT_NAME }}, {{ year }}</p>
      <RouterLink class="button" :to="{ name: 'register' }">
        Załóż konto
        <ArrowIcon />
      </RouterLink>
    </footer>
  </div>
</template>

<style scoped>
.vi {
  --ground: #dde4ee;
  --surface: #ffffff;
  --card: #ffffff;
  --ink: #16181d;
  --ink-soft: #4a4f5a;
  --hairline: rgb(22 24 29 / 0.14);
  --pen: #23408e;
  --duty: var(--pen);
  --sign: var(--pen);
  --radius: 1rem;
  --card-shadow: 0 1px 1px rgb(22 24 29 / 0.07), 0 16px 30px -16px rgb(22 24 29 / 0.3);
  --chat-task: #eef1f6;
  --chat-duty: #eef1f6;
  --display-stretch: 100%;
  --display-weight: 760;
  --pad: max(var(--gutter), calc((100vw - 74rem) / 2));
  background: var(--ground);
  color: var(--ink);
}

.vi ::selection {
  background: var(--pen);
  color: #fff;
}

.vi-top {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  height: 4rem;
  padding-inline: var(--pad);
}

.vi-top__mark {
  margin-right: auto;
  font-size: 1.1rem;
  font-weight: 760;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.vi-top__link {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
}

.vi-top__link:hover {
  text-decoration: underline;
}

.vi-hero {
  display: grid;
  gap: 1rem;
  padding: clamp(1.5rem, 0.5rem + 4.5vw, 4.5rem) var(--pad) clamp(1.5rem, 1rem + 2.5vw, 3rem);
}

.vi-hero__title {
  max-width: 11ch;
  font-size: clamp(3.1rem, 1.5rem + 8vw, 7.5rem);
  font-weight: 780;
  letter-spacing: -0.045em;
  line-height: 0.92;
}

.vi-hero__lead {
  max-width: 40ch;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  line-height: 1.4;
}

/* Kartka listu: biały papier na biurku, lekko przekrzywiony jak położony ręką. */
.vi-letter {
  display: grid;
  gap: clamp(1.5rem, 1rem + 2vw, 2.5rem);
  max-width: 52rem;
  margin-inline: max(0.6rem, calc(var(--pad) - 0.5rem)) auto;
  padding: clamp(1.4rem, 0.8rem + 3.5vw, 4rem);
  border-radius: 0.35rem;
  background: #fff;
  box-shadow:
    0 1px 2px rgb(22 24 29 / 0.12),
    0 30px 50px -24px rgb(22 24 29 / 0.4);
  rotate: -0.4deg;
}

.vi-letter__head {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.vi-letter__photo {
  display: grid;
  flex: none;
  place-items: center;
  width: 4.25rem;
  height: 4.25rem;
  border: 2px dashed color-mix(in srgb, var(--ink) 45%, transparent);
  border-radius: 50%;
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-weight: 650;
}

.vi-letter__from {
  display: grid;
  line-height: 1.3;
}

.vi-letter__from span {
  color: var(--ink-soft);
  font-size: 0.9375rem;
}

.vi-letter__text {
  display: grid;
  gap: 1.15em;
  font-size: clamp(1.15rem, 1.02rem + 0.6vw, 1.4rem);
  line-height: 1.55;
}

.vi-letter__text > p,
.vi-letter__row > p:first-child {
  max-width: 34em;
}

.vi-letter__hello {
  font-weight: 700;
}

.vi-letter__row {
  display: grid;
  gap: 0.3rem;
}

.vi-letter__text > :is(p, div) {
  transition:
    opacity 0.7s ease,
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.vi-letter__text > .is-waiting {
  opacity: 0;
  translate: 0 1.25rem;
}

/* Podkreślenie długopisem pod zdaniem, o które w liście chodzi. */
.vi-pen {
  font-weight: 650;
  text-decoration: underline;
  text-decoration-color: var(--pen);
  text-decoration-thickness: 0.11em;
  text-underline-offset: 0.2em;
}

/* Dopisek na marginesie, odręczny. */
.vi-note {
  color: var(--pen);
  font-family: 'Caveat', cursive;
  font-size: 1.5em;
  line-height: 1;
  rotate: -2deg;
  transform-origin: left center;
}

.vi-letter__sign {
  margin-top: 0.5rem;
  color: var(--pen);
  font-family: 'Caveat', cursive;
  font-size: clamp(2.4rem, 2rem + 2vw, 3.4rem);
  line-height: 1;
  rotate: -3deg;
  transform-origin: left center;
}

.vi-letter__ps {
  color: var(--ink-soft);
  font-size: 0.9em;
}

.vi-letter__ps a {
  color: var(--ink);
  font-weight: 650;
  white-space: nowrap;
}

.vi-letter__exams {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.75rem;
  padding: 1.25rem 0 0;
  border-top: 1px solid var(--hairline);
  list-style: none;
}

.vi-exam {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 700;
}

.vi-exam__solid {
  width: 2.75rem;
  height: 2.75rem;
  color: var(--exam);
}

.vi-section {
  display: grid;
  gap: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
  padding: clamp(3.5rem, 2.5rem + 5vw, 7rem) var(--pad);
  scroll-margin-top: 1rem;
  /* Sekcja poza ekranem nie jest liczona ani malowana, dopóki nie zbliży się do widoku. */
  content-visibility: auto;
  contain-intrinsic-size: auto 46rem;
}

.vi-h2 {
  max-width: 14ch;
  font-size: clamp(2.1rem, 1.5rem + 3.4vw, 4.25rem);
  font-weight: 760;
  letter-spacing: -0.04em;
  line-height: 0.98;
}

.vi-lead {
  max-width: 40ch;
  margin-top: 1.1rem;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.3rem);
  line-height: 1.45;
}

.vi-rise {
  transition:
    opacity 0.7s ease,
    translate 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.vi-rise.is-waiting {
  opacity: 0;
  translate: 0 1.75rem;
}

.vi-tickets {
  display: grid;
  gap: 1.25rem;
  padding: 0;
  list-style: none;
}

.vi-tickets li {
  scroll-margin-top: 1rem;
}

.vi-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem var(--pad) 2.5rem;
  border-top: 1px solid var(--hairline);
}

@media (min-width: 52rem) {
  /* Na szerokim ekranie dopiski stoją na marginesie obok akapitu. */
  .vi-letter__row {
    grid-template-columns: minmax(0, 1fr) 11rem;
    gap: 1.5rem;
    align-items: center;
  }

  .vi-note {
    rotate: -4deg;
  }
}

@media (min-width: 60rem) {
  .vi-split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: var(--gutter);
  }
}
</style>
