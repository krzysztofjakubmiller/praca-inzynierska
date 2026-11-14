<script setup lang="ts">
import { STEPS } from '@/landing2/content'
import { vReveal } from '@/landing2/reveal'
</script>

<template>
  <ol class="steps">
    <li v-for="(step, index) in STEPS" :key="step.title" v-reveal="index * 90" class="steps__stop">
      <h3 class="steps__title">{{ step.title }}</h3>
      <p class="steps__text">{{ step.text }}</p>
    </li>
  </ol>
</template>

<style scoped>
.steps {
  display: grid;
  padding: 0;
  color: var(--ink);
  list-style: none;
}

.steps__stop {
  position: relative;
  padding: 0 0 2.25rem 2.75rem;
}

/* Stacja: białe koło z grubym konturem, jak na schemacie. */
.steps__stop::before {
  content: '';
  position: absolute;
  top: 0.15rem;
  left: 0;
  z-index: 1;
  width: 1.35rem;
  height: 1.35rem;
  border: 0.3rem solid var(--step-line, var(--ink));
  border-radius: 50%;
  background: var(--step-fill, var(--ground));
  transition: scale 0.5s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.steps__stop:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 0.85rem;
  bottom: -0.15rem;
  left: 0.5rem;
  width: 0.35rem;
  background: var(--step-line, var(--ink));
  transform-origin: top;
  transition: scale 0.7s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms);
}

.steps__stop:last-child {
  padding-bottom: 0;
}

.steps__stop.is-waiting::before {
  scale: 0;
}

.steps__stop.is-waiting::after {
  scale: 1 0;
}

.steps__title {
  margin-bottom: 0.4rem;
  font-size: clamp(1.3rem, 1.1rem + 0.9vw, 1.75rem);
  font-weight: var(--display-weight, 760);
  font-stretch: var(--display-stretch, 100%);
  letter-spacing: -0.018em;
  line-height: 1.12;
}

.steps__text {
  max-width: 46ch;
  color: var(--ink-soft);
}
</style>
