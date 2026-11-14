<script setup lang="ts">
import { computed } from 'vue'
import { OPINIONS, OPINIONS_NOTE } from '@/landing2/content'

const hasExamples = computed(() => OPINIONS.some((opinion) => opinion.example))
</script>

<template>
  <div class="opinions">
    <ul class="opinions__list">
      <li v-for="opinion in OPINIONS" :key="opinion.text" class="opinions__item">
        <figure class="opinion" :class="{ 'opinion--example': opinion.example }">
          <!-- Etykieta jest częścią karty, więc przykładowa opinia nie da się pokazać bez niej. -->
          <p v-if="opinion.example" class="opinion__flag">Przykład</p>
          <blockquote class="opinion__text">„{{ opinion.text }}”</blockquote>
          <figcaption class="opinion__author">{{ opinion.author }}</figcaption>
        </figure>
      </li>
    </ul>
    <p v-if="hasExamples" class="opinions__note">{{ OPINIONS_NOTE }}</p>
  </div>
</template>

<style scoped>
.opinions {
  display: grid;
  gap: 1rem;
}

/* Na telefonie opinie przesuwa się w bok palcem, każda zatrzymuje się na swoim miejscu. */
.opinions__list {
  display: grid;
  grid-auto-columns: min(84%, 22rem);
  grid-auto-flow: column;
  gap: 1rem;
  margin-inline: calc(-1 * var(--gutter));
  padding: 0.25rem var(--gutter) 1rem;
  overflow-x: auto;
  list-style: none;
  scroll-padding-inline: var(--gutter);
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.opinions__item {
  display: grid;
  scroll-snap-align: start;
}

.opinion {
  position: relative;
  display: grid;
  align-content: space-between;
  gap: 1.5rem;
  margin: 0;
  padding: 2.6rem 1.35rem 1.35rem;
  border-radius: var(--radius, 1.25rem);
  background: var(--card, var(--surface));
  color: var(--ink);
  box-shadow: var(--card-shadow, none);
}

.opinion--example {
  background:
    repeating-linear-gradient(
      135deg,
      transparent 0 0.7rem,
      color-mix(in srgb, var(--ink) 5%, transparent) 0.7rem 0.78rem
    ),
    var(--card, var(--surface));
}

.opinion__flag {
  position: absolute;
  top: 0.85rem;
  left: 1.35rem;
  padding: 0.12rem 0.6rem 0.14rem;
  border-radius: 999px;
  background: var(--ink);
  color: var(--card, var(--surface));
  font-size: 0.75rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.opinion__text {
  margin: 0;
  font-size: clamp(1.15rem, 1.05rem + 0.5vw, 1.4rem);
  font-weight: 600;
  letter-spacing: -0.012em;
  line-height: 1.3;
  text-wrap: pretty;
}

.opinion__author {
  color: var(--ink-soft);
  font-size: 0.9375rem;
}

.opinions__note {
  max-width: 60ch;
  color: var(--note, var(--ink-soft));
  font-size: 0.9375rem;
}

@media (min-width: 52rem) {
  .opinions__list {
    grid-auto-columns: 1fr;
    margin-inline: 0;
    padding-inline: 0;
    overflow: visible;
  }
}
</style>
