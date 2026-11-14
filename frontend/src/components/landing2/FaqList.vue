<script setup lang="ts">
import { FAQ } from '@/landing2/content'
</script>

<template>
  <div class="faq">
    <details v-for="item in FAQ" :key="item.question" class="faq__item">
      <summary class="faq__question">
        {{ item.question }}
        <svg class="faq__sign" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 10h14" />
          <path class="faq__upright" d="M10 3v14" />
        </svg>
      </summary>
      <p class="faq__answer">{{ item.answer }}</p>
    </details>
  </div>
</template>

<style scoped>
.faq {
  border-bottom: 1px solid var(--hairline);
  color: var(--ink);
}

.faq__item {
  border-top: 1px solid var(--hairline);
}

.faq__question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.75rem;
  padding-block: 0.9rem;
  font-size: clamp(1.1rem, 1rem + 0.5vw, 1.35rem);
  font-weight: 700;
  letter-spacing: -0.012em;
  line-height: 1.2;
  list-style: none;
  cursor: pointer;
}

.faq__question::-webkit-details-marker {
  display: none;
}

.faq__sign {
  flex: none;
  width: 1.1rem;
  height: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
}

.faq__upright {
  transform-origin: center;
  transition: scale 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.faq__item[open] .faq__upright {
  scale: 1 0;
}

.faq__answer {
  max-width: 62ch;
  padding-bottom: 1.25rem;
  color: var(--ink-soft);
}

@media (prefers-reduced-motion: reduce) {
  .faq__upright {
    transition: none;
  }
}
</style>
