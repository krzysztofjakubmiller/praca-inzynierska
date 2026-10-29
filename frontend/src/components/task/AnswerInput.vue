<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'
import MathText from '@/components/task/MathText.vue'
import { readAnswer, type ResultKind } from '@/practice'

// Pole na jeden wynik końcowy. Pod polem jest to, co odczytał serwer, bo próba jest jedna
// i błąd zapisu kosztowałby punkty.
const props = defineProps<{ kind: ResultKind; label: string; disabled?: boolean }>()

const value = defineModel<string>({ required: true })
// true: serwer odczytał wpis, false: nie da się go odczytać, null: pusty albo jeszcze sprawdzany.
const readable = defineModel<boolean | null>('readable', { default: null })

// Klawiatura telefonu nie ma tych znaków, więc przyciski wstawiają je w miejscu kursora.
const KEYS: Record<ResultKind, string[]> = {
  liczba: ['√', 'π', '^', '/'],
  wartosci: [';', '√', '/'],
  przedzial: ['∞', '∪', '∅', 'ℝ', ';'],
  punkt: [';', '√'],
  rownanie: ['√', '^'],
  wyrazenie: ['√', '^'],
}

// Sam sposób zapisu, bez liczb, żeby przykład nie podpowiadał wyniku.
const PLACEHOLDERS: Record<ResultKind, string> = {
  liczba: 'np. a/b albo a√b',
  wartosci: 'wyniki po średniku: a; b',
  przedzial: 'np. (a; b) ∪ ⟨c; ∞)',
  punkt: 'np. (a; b)',
  rownanie: 'np. y = ax + b',
  wyrazenie: 'np. a(x + b)',
}

// Po tej przerwie w pisaniu pole pyta serwer o odczyt, a nie przy każdym znaku.
const PAUSE = 400

const id = useId()
const field = ref<HTMLInputElement>()
const latex = ref<string | null>(null)
const failed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(value, (text) => {
  clearTimeout(timer)
  readable.value = null
  latex.value = null
  failed.value = false
  if (!text.trim()) return
  timer = setTimeout(async () => {
    try {
      const read = await readAnswer(props.kind, text)
      // Uczeń mógł w tym czasie pisać dalej; wtedy liczy się nowszy odczyt.
      if (text !== value.value) return
      latex.value = read.latex
      readable.value = read.latex !== null
    } catch {
      failed.value = true
    }
  }, PAUSE)
})

function insert(key: string) {
  const input = field.value!
  const start = input.selectionStart ?? value.value.length
  const end = input.selectionEnd ?? start
  value.value = value.value.slice(0, start) + key + value.value.slice(end)
  nextTick(() => {
    input.focus()
    input.setSelectionRange(start + key.length, start + key.length)
  })
}
</script>

<template>
  <div class="answer-input">
    <label :for="id" class="answer-input__label">{{ label }}</label>
    <input
      :id="id"
      ref="field"
      v-model="value"
      class="answer-input__field"
      :placeholder="PLACEHOLDERS[kind]"
      :disabled="disabled"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />
    <div v-if="!disabled" class="answer-input__keys">
      <button
        v-for="key in KEYS[kind]"
        :key="key"
        type="button"
        class="answer-input__key"
        :aria-label="`Wstaw ${key}`"
        @click="insert(key)"
      >
        {{ key }}
      </button>
    </div>
    <p class="answer-input__read" aria-live="polite">
      <template v-if="latex">Odczytano: <MathText :text="`$${latex}$`" /></template>
      <template v-else-if="readable === false"
        >Nie rozumiem tego zapisu. Wpisz go inaczej.</template
      >
      <template v-else-if="failed">Nie udało się sprawdzić zapisu. Spróbuj jeszcze raz.</template>
    </p>
  </div>
</template>

<style scoped>
.answer-input {
  display: grid;
  gap: 0.4rem;
}

.answer-input__label {
  font-weight: 650;
}

.answer-input__field {
  min-height: 2.75rem;
  padding: 0.55em 0.7em;
  border: 1px solid var(--ink-soft);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
}

.answer-input__keys {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.answer-input__key {
  min-width: 2.75rem;
  min-height: 2.75rem;
  border: 1px solid var(--hairline);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 1.125rem;
  cursor: pointer;
}

.answer-input__key:hover {
  border-color: var(--ink-soft);
}

.answer-input__read {
  min-height: 1.5em;
  color: var(--ink-soft);
}
</style>
