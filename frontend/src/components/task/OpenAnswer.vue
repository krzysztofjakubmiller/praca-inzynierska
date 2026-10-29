<script setup lang="ts">
import { computed, ref } from 'vue'
import AnswerInput from '@/components/task/AnswerInput.vue'
import type { PracticeTask } from '@/practice'

// Zadanie otwarte: uczeń rozwiązuje w zeszycie albo na tablicy i wpisuje tylko wynik końcowy,
// raz. Punkty liczy backend. Dowód nie ma wyniku do wpisania, ocenia go AI.
const props = defineProps<{ task: PracticeTask }>()

const emit = defineEmits<{ done: [given: { answers: string[] }] }>()

const results = computed(() => props.task.results ?? [])
const answers = ref(results.value.map(() => ''))
const readable = ref<(boolean | null)[]>(results.value.map(() => null))
const sent = ref(false)

const ready = computed(() => readable.value.every((ok) => ok === true))

function label(index: number): string {
  const result = results.value[index]!
  if (!result.part) return results.value.length === 1 ? 'Twój wynik' : `Wynik ${index + 1}`
  return `Część ${result.part} (${result.points} pkt)`
}

function send() {
  sent.value = true
  emit('done', { answers: answers.value.map((answer) => answer.trim()) })
}
</script>

<template>
  <div class="open-answer">
    <template v-if="results.length">
      <p class="open-answer__intro">
        Rozwiąż zadanie w zeszycie albo na tablicy i wpisz wynik końcowy. Masz jedną próbę.
      </p>
      <AnswerInput
        v-for="(result, index) in results"
        :key="index"
        v-model="answers[index]!"
        v-model:readable="readable[index]"
        :kind="result.kind"
        :label="label(index)"
        :disabled="sent"
      />
      <button
        type="button"
        class="button open-answer__send"
        :disabled="!ready || sent"
        @click="send"
      >
        Wyślij wynik
      </button>
    </template>
    <template v-else>
      <p class="open-answer__intro">
        To zadanie na dowodzenie. Rozwiąż je w zeszycie albo na tablicy i wyślij do oceny przez AI.
      </p>
    </template>
  </div>
</template>

<style scoped>
.open-answer {
  display: grid;
  gap: 1rem;
}

.open-answer__intro {
  color: var(--ink-soft);
}

.open-answer__send {
  justify-self: start;
}
</style>
