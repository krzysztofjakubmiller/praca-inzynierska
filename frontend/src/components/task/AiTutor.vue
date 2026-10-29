<script setup lang="ts">
import { ref } from 'vue'
import AiFeedback from '@/components/task/AiFeedback.vue'
import MathText from '@/components/task/MathText.vue'
import SolutionEditor from '@/components/task/SolutionEditor.vue'
import { askAboutTask, Rejected, showAiSolution, type ChatMessage } from '@/practice'

// Po sprawdzeniu zadania: pełne rozwiązanie od AI na prośbę ucznia i rozmowa „Dopytaj się”.
// Rozmowa żyje tylko na tej stronie; backend dostaje ją całą przy każdym pytaniu.
const props = defineProps<{ taskId: number }>()

const solution = ref<{ text: string; requestId: number } | null>(null)
const messages = ref<ChatMessage[]>([])
// Zapytanie do AI przy każdej odpowiedzi, po indeksie wiadomości, do reakcji ucznia.
const answerRequests = ref<Record<number, number>>({})
const question = ref('')
// Nowy klucz czyści edytor po wysłaniu pytania.
const editorKey = ref(0)
const busy = ref(false)
const problems = ref<string[]>([])

async function run(action: () => Promise<void>) {
  busy.value = true
  problems.value = []
  try {
    await action()
  } catch (error) {
    problems.value =
      error instanceof Rejected ? error.problems : ['Nie udało się połączyć z serwerem.']
  } finally {
    busy.value = false
  }
}

function showSolution() {
  return run(async () => {
    const shown = await showAiSolution(props.taskId)
    solution.value = { text: shown.solution, requestId: shown.request_id }
  })
}

function ask() {
  return run(async () => {
    const asked: ChatMessage[] = [...messages.value, { role: 'user', content: question.value }]
    const { answer, request_id } = await askAboutTask(props.taskId, asked)
    answerRequests.value[asked.length] = request_id
    messages.value = [...asked, { role: 'assistant', content: answer }]
    question.value = ''
    editorKey.value++
  })
}
</script>

<template>
  <section class="ai-tutor">
    <div v-if="solution" class="ai-tutor__solution">
      <h3 class="ai-tutor__title">Rozwiązanie krok po kroku</h3>
      <MathText :text="solution.text" />
      <AiFeedback :request-id="solution.requestId" about="pomoc" />
    </div>
    <button
      v-else
      type="button"
      class="button button--quiet ai-tutor__action"
      :disabled="busy"
      @click="showSolution"
    >
      Pokaż rozwiązanie krok po kroku
    </button>

    <h3 class="ai-tutor__title">Dopytaj się</h3>
    <template v-for="(message, index) in messages" :key="index">
      <p class="ai-tutor__message" :class="`ai-tutor__message--${message.role}`">
        <MathText :text="message.content" />
      </p>
      <AiFeedback v-if="answerRequests[index]" :request-id="answerRequests[index]" about="pomoc" />
    </template>
    <SolutionEditor
      :key="editorKey"
      v-model="question"
      placeholder="Zapytaj o metodę albo o krok, którego nie rozumiesz."
    />
    <button
      type="button"
      class="button ai-tutor__action"
      :disabled="!question.trim() || busy"
      @click="ask"
    >
      {{ busy ? 'Chwila' : 'Zapytaj' }}
    </button>
    <p v-for="problem in problems" :key="problem" class="ai-tutor__problem" role="alert">
      {{ problem }}
    </p>
  </section>
</template>

<style scoped>
.ai-tutor {
  display: grid;
  gap: 0.75rem;
}

.ai-tutor__title {
  font-size: 1.0625rem;
  font-weight: 700;
}

.ai-tutor__solution {
  display: grid;
  gap: 0.5rem;
  line-height: 1.55;
}

.ai-tutor__action {
  justify-self: start;
}

.ai-tutor__message {
  max-width: 90%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  line-height: 1.5;
}

.ai-tutor__message--user {
  justify-self: end;
  background: var(--hairline);
}

.ai-tutor__message--assistant {
  justify-self: start;
  border: 2px solid var(--hairline);
}

.ai-tutor__problem {
  color: var(--danger);
  font-weight: 600;
}
</style>
