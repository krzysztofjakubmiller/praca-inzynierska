<script setup lang="ts">
import { ref } from 'vue'
import DutyChat from '@/components/landing2/DutyChat.vue'
import FlapText from '@/components/landing3/FlapText.vue'
import MathText from '@/components/landing2/MathText.vue'
import type { Look } from '../AppScreen.vue'

// Ekran zadania na jednym przykładowym zadaniu z logarytmów.
defineProps<{ look: Look }>()

const TASK = 'log_{2} 32 + log_{3} 9'
const EXPECTED = 7
const POSITION = 3
const COUNT = 8
const RATINGS = ['Łatwe', 'Średnie', 'Trudne', 'Bardzo trudne']

const answer = ref('')
const state = ref<'open' | 'wrong' | 'right'>('open')
const helpOpen = ref(false)
const rating = ref<string>()

function check() {
  const value = Number(answer.value.trim().replace(',', '.'))
  if (answer.value.trim() === '' || Number.isNaN(value)) return
  state.value = value === EXPECTED ? 'right' : 'wrong'
}
</script>

<template>
  <div class="task">
    <div class="task__bar">
      <p class="as-title task__topic">Logarytmy</p>
      <p class="task__count">
        <span class="as-label">Zadanie</span>
        <FlapText
          v-if="look === 'b'"
          class="as-flaps as-flaps--amber task__flaps"
          :text="`${POSITION} z ${COUNT}`"
          :cells="5"
          settled
        />
        <strong v-else class="as-count">{{ POSITION }} z {{ COUNT }}</strong>
      </p>
      <div
        class="task__track"
        role="progressbar"
        aria-label="Postęp w zestawie"
        :aria-valuenow="POSITION"
        aria-valuemin="0"
        :aria-valuemax="COUNT"
      >
        <span :style="{ width: `${(POSITION / COUNT) * 100}%` }" />
      </div>
    </div>

    <main class="task__main">
      <form class="task__card" :class="`task__card--${state}`" @submit.prevent="check">
        <p class="as-label">Matura podstawowa · typ zadania z arkusza CKE, nowe liczby</p>
        <h1 class="task__text">
          <span class="task__verb">Oblicz</span>
          <span class="task__math"><MathText :text="TASK" /></span>
        </h1>

        <label class="task__answer">
          <span class="as-label">Twój wynik</span>
          <input
            v-model="answer"
            inputmode="text"
            autocomplete="off"
            :readonly="state === 'right'"
            :aria-invalid="state === 'wrong'"
          />
        </label>

        <div class="task__actions">
          <button v-if="state !== 'right'" class="button as-cta" type="submit">Sprawdź</button>
          <button v-else class="button as-cta" type="button">Następne zadanie</button>
          <button class="button button--quiet" type="button" @click="helpOpen = !helpOpen">
            {{ helpOpen ? 'Schowaj Dyżurnego' : 'Zapytaj Dyżurnego' }}
          </button>
        </div>

        <p v-if="state === 'right'" class="task__verdict task__verdict--right" role="status">
          Dobrze. Wynik sprawdził program.
        </p>
        <p v-else-if="state === 'wrong'" class="task__verdict task__verdict--wrong" role="status">
          Jeszcze nie. Sprawdź pierwszy logarytm albo zapytaj Dyżurnego.
        </p>

        <fieldset v-if="state === 'right'" class="task__rating">
          <legend class="as-label">Jak ci poszło?</legend>
          <button
            v-for="name in RATINGS"
            :key="name"
            class="task__rate"
            type="button"
            :aria-pressed="rating === name"
            @click="rating = name"
          >
            {{ name }}
          </button>
        </fieldset>
      </form>

      <DutyChat v-if="helpOpen" class="task__help" />
    </main>
  </div>
</template>

<style scoped>
.task {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.task__bar {
  display: grid;
  flex: none;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.6rem 1rem;
  align-items: center;
  padding: 0.75rem var(--gutter) 0;
}

.task__count {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.task__flaps {
  --cell: 1.05rem;
  padding: 0.3rem;
  border-radius: 0.45rem;
  background: #24221e;
}

.task__topic {
  font-size: clamp(1.3rem, 1.1rem + 1vw, 1.8rem);
}

/* Cienki tor postępu w zestawie. */
.task__track {
  grid-column: 1 / -1;
  height: 0.3rem;
  margin-inline: calc(-1 * var(--gutter));
  background: var(--track);
}

.task__track span {
  display: block;
  height: 100%;
  background: var(--duty);
}

.task__main {
  display: grid;
  gap: 1.25rem;
  align-content: start;
  flex: 1;
  width: min(100%, 46rem);
  margin-inline: auto;
  padding: clamp(1.25rem, 1rem + 2vw, 2.5rem) var(--gutter) 3rem;
}

.task__card {
  display: grid;
  gap: 1.25rem;
  padding: clamp(1.25rem, 1rem + 1.5vw, 2rem);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow:
    0 1px 1px rgb(0 0 0 / 0.05),
    0 14px 26px -16px rgb(0 0 0 / 0.3);
}

.task__text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2em 0.5em;
  font-size: clamp(1.9rem, 1.3rem + 3vw, 3rem);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.task__verb {
  color: var(--ink-soft);
  font-size: 0.5em;
  font-weight: 600;
  letter-spacing: 0;
}

.task__math {
  white-space: nowrap;
}

.task__answer {
  display: grid;
  gap: 0.4rem;
  max-width: 14rem;
}

.task__answer input {
  width: 100%;
  min-height: 3.25rem;
  padding: 0 1rem;
  border: 2px solid var(--ink);
  border-radius: 0.8rem;
  background: var(--ground);
  color: var(--ink);
  caret-color: var(--duty);
  font: inherit;
  font-size: 1.4rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.task__card--wrong .task__answer input {
  border-color: var(--danger);
}

.task__card--right .task__answer input {
  border-color: var(--correct);
}

.task__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.task__verdict {
  font-weight: 650;
}

.task__verdict--right {
  color: var(--correct);
}

.task__verdict--wrong {
  color: var(--danger);
}

.task__rating {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 1rem 0 0;
  border: 0;
  border-top: 1px solid var(--hairline);
}

.task__rating legend {
  float: left;
  width: 100%;
  margin-bottom: 0.6rem;
  padding: 0;
}

.task__rate {
  min-height: 2.75rem;
  padding: 0 1rem;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.task__rate[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
}
</style>
