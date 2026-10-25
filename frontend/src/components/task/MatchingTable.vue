<script setup lang="ts">
import { computed } from 'vue'
import MathText from '@/components/task/MathText.vue'
import '@/assets/task.css'

// Bez picked tabela tylko pokazuje warianty (podgląd w panelu). Z picked uczeń wybiera jedną
// literę i jedną cyfrę, a picked to ich para, np. "B1". answer to klucz po sprawdzeniu.
const props = defineProps<{
  choices: { label: string; text: string }[]
  connector: string
  picked?: string
  answer?: string
}>()

const emit = defineEmits<{ pick: [label: string] }>()

function markClass(label: string) {
  if (props.answer === undefined) return {}
  return {
    'answer-mark--key': props.answer.includes(label),
    'answer-mark--wrong': !props.answer.includes(label),
  }
}

// Jak w arkuszu CKE: warianty z literami po lewej, z cyframi po prawej, a między nimi tekst
// wspólny dla wszystkich wierszy.
const isDigit = (label: string) => /^\d/.test(label)
const letters = computed(() => props.choices.filter((choice) => !isDigit(choice.label)))
const digits = computed(() => props.choices.filter((choice) => isDigit(choice.label)))
</script>

<template>
  <div class="matching-box">
    <div class="matching">
      <div class="matching__group">
        <div v-for="choice in letters" :key="choice.label" class="matching__row">
          <strong v-if="picked === undefined" class="matching__label">{{ choice.label }}.</strong>
          <span v-else class="matching__label matching__label--choice">
            <button
              type="button"
              class="answer-mark"
              :class="markClass(choice.label)"
              :aria-pressed="picked.includes(choice.label)"
              :disabled="answer !== undefined"
              @click="emit('pick', choice.label)"
            >
              {{ choice.label }}.
            </button>
          </span>
          <MathText :text="choice.text" class="matching__text" />
        </div>
      </div>
      <div class="matching__connector"><MathText :text="connector" /></div>
      <div class="matching__group">
        <div v-for="choice in digits" :key="choice.label" class="matching__row">
          <strong v-if="picked === undefined" class="matching__label">{{ choice.label }}.</strong>
          <span v-else class="matching__label matching__label--choice">
            <button
              type="button"
              class="answer-mark"
              :class="markClass(choice.label)"
              :aria-pressed="picked.includes(choice.label)"
              :disabled="answer !== undefined"
              @click="emit('pick', choice.label)"
            >
              {{ choice.label }}.
            </button>
          </span>
          <MathText :text="choice.text" class="matching__text" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.matching-box {
  container-type: inline-size;
}

/* Każda kolumna zajmuje całą wysokość tabeli, więc 2 wiersze z lewej są tak samo wysokie
   jak 3 z prawej, a tekst środkowy obejmuje wszystkie. */
.matching {
  display: grid;
  /* Środek bierze tyle, ile potrzebuje jego tekst, żeby krótkie „ponieważ” nie zabierało
     miejsca wzorom w wariantach; dłuższy tekst łamie się powyżej 30% szerokości. */
  grid-template-columns: minmax(0, 1fr) fit-content(30%) minmax(0, 1fr);
  border: 1px solid var(--ink);
}

.matching__group {
  display: grid;
  grid-auto-rows: 1fr;
}

.matching__row {
  display: grid;
  grid-template-columns: 2.5rem 1fr;
}

.matching__row + .matching__row {
  border-top: 1px solid var(--ink);
}

.matching__label {
  display: grid;
  place-items: center;
  border-right: 1px solid var(--ink);
}

.matching__label--choice {
  place-items: stretch;
}

.matching__text {
  align-self: center;
  padding: 0.5rem 0.75rem;
}

.matching__connector {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-inline: 1px solid var(--ink);
}

/* Na wąskim ekranie trzy kolumny ściskały wzory do kilku znaków w wierszu, więc warianty z
   literami, tekst środkowy i warianty z cyframi stają jeden pod drugim. */
@container (width < 34rem) {
  .matching {
    grid-template-columns: minmax(0, 1fr);
  }

  .matching__group {
    grid-auto-rows: auto;
  }

  .matching__connector {
    border-inline: 0;
    border-block: 1px solid var(--ink);
    font-weight: 650;
  }
}
</style>
