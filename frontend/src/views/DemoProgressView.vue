<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import ExamHeading from '@/components/stats/ExamHeading.vue'
import ProgressCharts from '@/components/stats/ProgressCharts.vue'
import type { Exam } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { DAILY_REVIEW_LIMITS } from '@/profile'
import { DEMO_TARGET, demoProgressStats } from '@/stats/demoStats'
import { setTheme, theme } from '@/theme'

const props = defineProps<{ exam: Exam['id'] }>()

const stats = computed(() => demoProgressStats(props.exam))
</script>

<template>
  <div class="demo">
    <header class="demo__top">
      <RouterLink class="demo__home" :to="{ name: 'landing' }">{{ PRODUCT_NAME }}</RouterLink>
      <button
        type="button"
        class="icon-button demo__theme"
        aria-label="Ciemny motyw"
        :aria-pressed="theme === 'dark'"
        @click="setTheme(theme === 'dark' ? 'light' : 'dark')"
      >
        <AppIcon name="theme" />
      </button>
    </header>

    <main class="demo__main">
      <div class="demo__sign">
        <StationMarker shape="question" class="demo__sign-marker" />
        <p class="demo__sign-name">Przykładowe dane</p>
      </div>
      <p class="demo__lead">
        Tak wygląda postęp ucznia po kilku tygodniach nauki. Liczby są wymyślone, wykresy te same,
        które dostaniesz na swoim koncie.
      </p>
      <RouterLink class="button demo__action" :to="{ name: 'register' }">Załóż konto</RouterLink>

      <ExamHeading class="demo__heading" :exam-id="exam" other-route="demo-progress" />
      <ProgressCharts :stats="stats" :target="DEMO_TARGET" :limit="DAILY_REVIEW_LIMITS.srednio" />

      <section class="demo__close" aria-labelledby="demo-close-title">
        <h2 id="demo-close-title" class="demo__close-title">Twoja trasa zaczyna się od zadania</h2>
        <p>Po założeniu konta te wykresy liczą się z twoich zadań, powtórek i arkuszy.</p>
        <RouterLink class="button" :to="{ name: 'register' }">Załóż konto</RouterLink>
      </section>
    </main>
  </div>
</template>

<style scoped>
.demo__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-h);
  padding-inline: var(--gutter);
  border-bottom: 1px solid var(--hairline);
}

.demo__home {
  font-weight: 800;
  font-variation-settings: 'wdth' 112;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.demo__theme {
  margin-right: -0.625rem;
}

.demo__main {
  display: grid;
  gap: 1.25rem;
  max-width: 64rem;
  margin-inline: auto;
  padding: 2rem var(--gutter) 5rem;
  overflow-x: clip;
}

/* Czarny znak stacji jak „Jak to działa” na wizytówce: pas wychodzi zza lewej krawędzi. */
.demo__sign {
  --marker-fill: var(--ink);
  --marker-stroke: var(--surface);

  display: flex;
  align-items: center;
  gap: 0.3em;
  width: fit-content;
  max-width: calc(100% + var(--gutter));
  margin-left: calc(-1 * var(--gutter));
  padding: 0.2em 0.62em 0.24em var(--gutter);
  border-radius: 0 999px 999px 0;
  background: var(--ink);
  color: var(--ground);
  font-size: clamp(1.75rem, 1.1rem + 3.2vw, 3rem);
}

.demo__sign-marker {
  flex: none;
  font-size: 0.6em;
}

.demo__sign-name {
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: 0.005em;
  line-height: 1.02;
  text-transform: uppercase;
}

.demo__lead {
  max-width: 34ch;
  font-size: clamp(1.125rem, 1rem + 0.55vw, 1.4rem);
  line-height: 1.45;
}

.demo__action {
  justify-self: start;
}

.demo__heading {
  margin-top: 1.5rem;
}

.demo__close {
  display: grid;
  justify-items: start;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--hairline);
}

.demo__close-title {
  font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.25rem);
  font-weight: 750;
  font-variation-settings: 'wdth' 90;
  letter-spacing: -0.02em;
  line-height: 1.05;
}

.demo__close p {
  max-width: 40ch;
}
</style>
