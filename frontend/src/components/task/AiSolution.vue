<script setup lang="ts">
import { ref } from 'vue'
import AiFeedback from '@/components/task/AiFeedback.vue'
import MathText from '@/components/task/MathText.vue'
import { aiProblem, showAiSolution } from '@/practice'

// Pełne rozwiązanie od AI na prośbę ucznia, dostępne dopiero po sprawdzeniu odpowiedzi.
// Tekst dopisuje się kawałkami; reakcje ucznia pojawiają się dopiero przy całym rozwiązaniu.
const props = defineProps<{ taskId: number }>()

const text = ref('')
const requestId = ref<number | null>(null)
const busy = ref(false)
const problem = ref<{ text: string; retry: boolean } | null>(null)

async function show() {
  busy.value = true
  problem.value = null
  text.value = ''
  try {
    requestId.value = await showAiSolution(props.taskId, (piece) => {
      text.value += piece
    })
  } catch (error) {
    text.value = ''
    problem.value = aiProblem(error, 'Połączenie się urwało, zanim rozwiązanie było gotowe.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section v-if="text" class="ai-solution">
    <h3 class="ai-solution__title">Rozwiązanie krok po kroku</h3>
    <MathText :text="text" />
    <AiFeedback v-if="requestId" :request-id="requestId" about="pomoc" />
  </section>
  <div v-else class="ai-solution">
    <button
      v-if="!problem || problem.retry"
      type="button"
      class="button button--quiet ai-solution__show"
      :disabled="busy"
      @click="show"
    >
      <template v-if="busy">Chwila…</template>
      <template v-else-if="problem">Spróbuj ponownie</template>
      <template v-else>Pokaż rozwiązanie krok po kroku</template>
    </button>
    <p v-if="problem" class="ai-solution__problem" role="alert">{{ problem.text }}</p>
  </div>
</template>

<style scoped>
.ai-solution {
  display: grid;
  gap: 0.5rem;
  line-height: 1.55;
}

.ai-solution__title {
  font-size: 1.0625rem;
  font-weight: 700;
}

.ai-solution__show {
  justify-self: start;
}

.ai-solution__problem {
  color: var(--danger);
  font-weight: 600;
}
</style>
