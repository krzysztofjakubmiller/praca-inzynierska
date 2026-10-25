<script setup lang="ts">
import { ref } from 'vue'
import MathText from '@/components/task/MathText.vue'
import type { PracticeTask } from '@/practice'

// Samoocena zadania otwartego: uczeń rozwiązuje w zeszycie, porównuje z kluczem i sam podaje
// punkty. Zadania z krokami schematu CKE mają zamiast tego sprawdzanie krok po kroku.
defineProps<{ task: PracticeTask }>()

const emit = defineEmits<{ done: [result: { points: number }] }>()

const shown = ref(false)
const chosen = ref<number | null>(null)

function choose(points: number) {
  chosen.value = points
  emit('done', { points })
}
</script>

<template>
  <div class="open-answer">
    <button v-if="!shown" type="button" class="button" @click="shown = true">
      Pokaż rozwiązanie
    </button>
    <template v-else>
      <section class="open-answer__model" aria-label="Rozwiązanie z klucza">
        <MathText :text="task.model_answer ?? ''" />
      </section>
      <fieldset class="open-answer__points">
        <legend>Ile punktów ma Twoje rozwiązanie?</legend>
        <button
          v-for="points in task.max_points + 1"
          :key="points"
          type="button"
          class="button button--quiet"
          :aria-pressed="chosen === points - 1"
          :disabled="chosen !== null"
          @click="choose(points - 1)"
        >
          {{ points - 1 }} z {{ task.max_points }}
        </button>
      </fieldset>
    </template>
  </div>
</template>

<style scoped>
.open-answer {
  display: grid;
  justify-items: start;
  gap: 1rem;
}

.open-answer__model {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 1px solid var(--hairline);
  border-radius: 1rem;
}

.open-answer__points {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  border: 0;
}

.open-answer__points legend {
  margin-bottom: 0.5rem;
  font-weight: 650;
}

.open-answer__points .button[aria-pressed='true'] {
  background: var(--ink);
  color: var(--ground);
}
</style>
