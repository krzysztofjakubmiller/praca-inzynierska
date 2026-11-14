<script setup lang="ts">
import '@fontsource/caveat/latin-400.css'
import '@fontsource/caveat/latin-ext-400.css'
import { FOUNDER } from '@/landing2/content'
</script>

<template>
  <div class="founder">
    <div class="founder__media">
      <!-- Miejsca na pliki. Po podmianie na <img> i <video> ramki z kreskami znikają. -->
      <div class="founder__slot founder__slot--photo" role="img" :aria-label="FOUNDER.photoHint">
        <svg class="founder__mark" viewBox="0 0 48 48" aria-hidden="true">
          <rect x="6" y="9" width="36" height="30" rx="5" />
          <circle cx="18" cy="20" r="3.6" />
          <path d="M8 34l10-9 7 6 6-5 9 8" />
        </svg>
        <span class="founder__hint">{{ FOUNDER.photoHint }}</span>
      </div>
      <div class="founder__slot founder__slot--video" role="img" :aria-label="FOUNDER.videoHint">
        <svg class="founder__mark" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="17" />
          <path d="M20 16.5v15l12-7.5z" />
        </svg>
        <span class="founder__hint">{{ FOUNDER.videoHint }}</span>
      </div>
    </div>
    <div class="founder__body">
      <p class="founder__words">{{ FOUNDER.words }}</p>
      <p class="founder__sign">{{ FOUNDER.name }}</p>
      <p class="founder__role">{{ FOUNDER.role }}</p>
    </div>
  </div>
</template>

<style scoped>
.founder {
  display: grid;
  gap: clamp(1.5rem, 1rem + 2.5vw, 3.5rem);
  align-items: center;
  color: var(--ink);
}

.founder__media {
  display: grid;
  grid-template-columns: 5fr 4fr;
  gap: 0.75rem;
  align-items: end;
  max-width: 30rem;
}

.founder__slot {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.6rem;
  padding: 1rem;
  border: 2px dashed color-mix(in srgb, var(--ink) 45%, transparent);
  border-radius: var(--radius, 1.25rem);
  background:
    repeating-linear-gradient(
      135deg,
      transparent 0 0.7rem,
      color-mix(in srgb, var(--ink) 6%, transparent) 0.7rem 0.78rem
    ),
    var(--card, var(--surface));
  text-align: center;
}

.founder__slot--photo {
  aspect-ratio: 4 / 5;
}

.founder__slot--video {
  aspect-ratio: 9 / 16;
}

.founder__mark {
  width: 2.75rem;
  height: 2.75rem;
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.founder__hint {
  max-width: 12ch;
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.25;
}

.founder__body {
  display: grid;
  gap: 0.5rem;
  max-width: 34rem;
}

.founder__words {
  font-size: clamp(1.25rem, 1.05rem + 0.9vw, 1.75rem);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.3;
}

/* Podpis odręczny: jedyne miejsce na stronie pisane ręką, tak jak zadania układane ręcznie. */
.founder__sign {
  margin-top: 0.75rem;
  color: var(--sign, var(--ink));
  font-family: 'Caveat', cursive;
  font-size: clamp(2.2rem, 1.8rem + 1.8vw, 3.2rem);
  line-height: 1;
  rotate: -2deg;
  transform-origin: left center;
}

.founder__role {
  color: var(--ink-soft);
  font-size: 0.9375rem;
}

@media (min-width: 52rem) {
  .founder {
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  }
}
</style>
