<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { tidy } from '@/landing2/content'
import MathText from './MathText.vue'
import WhoIcon from './WhoIcon.vue'

// Jeden typ zadania z matury podstawowej (logarytmy), za każdym razem z innymi liczbami.
// Wynik sprawdza zwykłe porównanie liczb, tak jak w aplikacji robi to program, a nie AI.

interface Variant {
  base1: number
  power1: number
  base2: number
  power2: number
  sign: 1 | -1
}

// Największy wykładnik dla podstawy, żeby liczba pod logarytmem dała się policzyć w pamięci.
const MAX_POWER: Record<number, number> = { 2: 6, 3: 4, 5: 3 }
const BASES = [2, 3, 5]

function pick(from: number, to: number): number {
  return from + Math.floor(Math.random() * (to - from + 1))
}

function drawVariant(previous: Variant): Variant {
  for (;;) {
    const base1 = BASES[pick(0, 2)]!
    const base2 = BASES[pick(0, 2)]!
    const variant: Variant = {
      base1,
      base2,
      power1: pick(2, MAX_POWER[base1]!),
      power2: pick(2, MAX_POWER[base2]!),
      sign: Math.random() < 0.5 ? 1 : -1,
    }
    const same = variant.base1 === previous.base1 && variant.power1 === previous.power1
    if (base1 !== base2 && !same) return variant
  }
}

// Pierwszy wariant jest stały, żeby strona wyglądała tak samo przy każdym otwarciu.
const id = useId()
const variant = ref<Variant>({ base1: 2, power1: 5, base2: 3, power2: 2, sign: 1 })
const count = ref(1)
const answer = ref('')
const misses = ref(0)
const state = ref<'open' | 'wrong' | 'right'>('open')

const expected = computed(() => variant.value.power1 + variant.value.sign * variant.value.power2)

const taskText = computed(() => {
  const { base1, power1, base2, power2, sign } = variant.value
  return `log_{${base1}} ${base1 ** power1} ${sign > 0 ? '+' : '−'} log_{${base2}} ${base2 ** power2}`
})

const hint = computed(() => {
  const { base1, power1 } = variant.value
  return misses.value < 2
    ? `Zacznij od pierwszego logarytmu: do jakiej potęgi trzeba podnieść ${base1}, żeby dostać ${base1 ** power1}?`
    : `log_{${base1}} ${base1 ** power1} = ${power1}, bo ${base1}^{${power1}} = ${base1 ** power1}. Tak samo policz drugi logarytm.`
})

const explanation = computed(() => {
  const { base1, power1, base2, power2, sign } = variant.value
  return `log_{${base1}} ${base1 ** power1} = ${power1}, log_{${base2}} ${base2 ** power2} = ${power2}, więc wynik to ${power1} ${sign > 0 ? '+' : '−'} ${power2} = ${expected.value}.`
})

function check() {
  // Uczeń może wpisać minus z klawiatury albo typograficzny, a zamiast kropki przecinek.
  const value = Number(answer.value.trim().replace('−', '-').replace(',', '.'))
  if (answer.value.trim() === '' || Number.isNaN(value)) return
  if (value === expected.value) {
    state.value = 'right'
  } else {
    state.value = 'wrong'
    misses.value++
  }
}

function again() {
  variant.value = drawVariant(variant.value)
  count.value++
  answer.value = ''
  misses.value = 0
  state.value = 'open'
}
</script>

<template>
  <div class="trial" :class="`trial--${state}`">
    <div class="trial__head">
      <h3 class="trial__title">Przejedź jedną stację</h3>
      <p class="trial__intro">
        {{ tidy('Zadanie z logarytmów, jak na maturze podstawowej. Bez konta i bez czekania.') }}
      </p>
    </div>

    <form class="trial__task" @submit.prevent="check">
      <p class="trial__count" aria-live="polite">
        {{ count === 1 ? 'Wariant 1' : `Wariant ${count}: ten sam typ zadania, nowe liczby` }}
      </p>
      <p class="trial__expression">
        <span class="trial__verb">Oblicz</span>
        <span class="trial__math"><MathText :text="taskText" /></span>
      </p>

      <div class="trial__answer">
        <label class="trial__label" :for="`${id}-answer`">Twój wynik</label>
        <div class="trial__row">
          <input
            :id="`${id}-answer`"
            v-model="answer"
            class="trial__input"
            inputmode="text"
            autocomplete="off"
            :readonly="state === 'right'"
            :aria-invalid="state === 'wrong'"
            :aria-describedby="`${id}-feedback`"
          />
          <button v-if="state !== 'right'" class="button trial__button" type="submit">
            Sprawdź
          </button>
          <button v-else class="button trial__button" type="button" @click="again">
            Wylosuj nowe liczby
          </button>
        </div>
      </div>

      <div :id="`${id}-feedback`" class="trial__feedback" aria-live="polite">
        <p v-if="state === 'right'" class="trial__verdict">
          <WhoIcon who="program" />
          <span>
            <strong>Dobrze.</strong> <MathText :text="explanation" /> Sprawdził to program, nie AI.
          </span>
        </p>
        <p v-else-if="state === 'wrong'" class="trial__verdict">
          <WhoIcon who="duty" />
          <span>
            <strong>Jeszcze nie.</strong> <MathText :text="hint" />
            <span class="trial__aside">
              To przykładowa podpowiedź. W aplikacji Dyżurny odpowiada na twoje pytania.
            </span>
          </span>
        </p>
        <p v-else class="trial__verdict trial__verdict--quiet">
          <WhoIcon who="human" />
          <span>Typ zadania ułożył człowiek. Liczby losują się przy każdej powtórce.</span>
        </p>
      </div>
    </form>
  </div>
</template>

<style scoped>
.trial {
  display: grid;
  gap: clamp(1.25rem, 1rem + 1.2vw, 2rem);
  padding: clamp(1.25rem, 0.9rem + 1.8vw, 2.25rem);
  border-radius: var(--radius, 1.25rem);
  background: var(--card, var(--surface));
  color: var(--ink);
  box-shadow: var(--card-shadow, none);
}

.trial__head {
  display: grid;
  gap: 0.5rem;
}

.trial__title {
  font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.25rem);
  font-weight: var(--display-weight, 780);
  font-stretch: var(--display-stretch, 100%);
  letter-spacing: -0.02em;
}

.trial__intro {
  max-width: 44ch;
  color: var(--ink-soft);
}

.trial__task {
  display: grid;
  gap: 1rem;
}

.trial__count {
  color: var(--ink-soft);
  font-size: 0.875rem;
  font-weight: 600;
}

.trial__expression {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2em 0.5em;
  font-size: clamp(1.6rem, 1.15rem + 2.2vw, 2.6rem);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.trial__math {
  white-space: nowrap;
}

.trial__verb {
  color: var(--ink-soft);
  font-size: 0.55em;
  font-weight: 600;
  letter-spacing: 0;
}

.trial__answer {
  display: grid;
  gap: 0.35rem;
}

.trial__label {
  font-size: 0.9375rem;
  font-weight: 600;
}

.trial__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.trial__input {
  flex: 1 1 6rem;
  width: 6rem;
  min-height: 3rem;
  padding: 0 1rem;
  border: 2px solid var(--ink);
  border-radius: 0.85rem;
  background: var(--card, var(--surface));
  color: var(--ink);
  caret-color: var(--accent, var(--ink));
  font: inherit;
  font-size: 1.25rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.trial--wrong .trial__input {
  border-color: var(--danger);
}

.trial--right .trial__input {
  border-color: var(--correct);
}

.trial__button {
  flex: 0 0 auto;
}

.trial__feedback {
  min-height: 4.6rem;
}

.trial__verdict {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  max-width: 52ch;
  line-height: 1.45;
}

.trial__verdict .who {
  margin-top: 0.1em;
  font-size: 1.4rem;
}

.trial--right .trial__verdict .who {
  color: var(--correct);
}

.trial--wrong .trial__verdict .who {
  color: var(--duty, var(--ink));
}

.trial__verdict--quiet {
  color: var(--ink-soft);
}

.trial__aside {
  display: block;
  margin-top: 0.3rem;
  color: var(--ink-soft);
  font-size: 0.875rem;
}

@media (min-width: 52rem) {
  .trial {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
  }
}
</style>
