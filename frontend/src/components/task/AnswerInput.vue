<script setup lang="ts">
import { onMounted, ref, useId, watch } from 'vue'
import 'mathlive/fonts.css'
import MathText from '@/components/task/MathText.vue'
import { loadMathLive } from '@/mathKeyboard'
import { readAnswer, type ResultKind } from '@/practice'

// Pole na jeden wynik końcowy. Wynik wpisuje się w edytorze wzorów, a nie w zwykłym tekście:
// w tekście „18√3π” nie wiadomo, gdzie kończy się pierwiastek, a w edytorze pierwiastek ma
// własne okienko i resztę dopisuje się za nim w dowolnej kolejności. Pod polem jest to, co
// odczytał serwer, bo próba jest jedna i błąd zapisu kosztowałby punkty.
const props = defineProps<{ kind: ResultKind; label: string; disabled?: boolean }>()

// Wpis w LaTeX-u, tak jak go oddaje edytor; serwer czyta LaTeX tak samo jak zwykły tekst.
const value = defineModel<string>({ required: true })
// true: serwer odczytał wpis, false: nie da się go odczytać, null: pusty albo jeszcze sprawdzany.
const readable = defineModel<boolean | null>('readable', { default: null })

// Sam sposób zapisu, bez liczb, żeby przykład nie podpowiadał wyniku. Edytor pokazuje
// podpowiedź jako wzór, więc słowa są w \text.
const PLACEHOLDERS: Record<ResultKind, string> = {
  liczba: '\\text{np. }\\frac{a}{b}\\text{ albo }a\\sqrt{b}',
  wartosci: '\\text{wyniki po średniku: }a;\\ b',
  przedzial: '\\text{np. }(a;\\ b)\\cup\\langle c;\\ \\infty)',
  punkt: '\\text{np. }(a;\\ b)',
  rownanie: '\\text{np. }y=ax+b',
  wyrazenie: '\\text{np. }a(x+b)',
}

// Po tej przerwie w pisaniu pole pyta serwer o odczyt, a nie przy każdym znaku.
const PAUSE = 400

const id = useId()
const ready = ref(false)
const latex = ref<string | null>(null)
const failed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

// Edytor zapisuje każdy nawias jako \left( ... \right), a serwer nie czyta tak zapisanego punktu.
// Te znaczniki zmieniają tylko wysokość nawiasu, więc można je pominąć.
function plain(latex: string): string {
  return latex.replace(/\\(left|right)(?![a-z])/g, '')
}

onMounted(async () => {
  await loadMathLive()
  ready.value = true
})

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
</script>

<template>
  <div class="answer-input">
    <label :for="id" class="answer-input__label">{{ label }}</label>
    <math-field
      v-if="ready"
      :id="id"
      class="answer-input__field"
      math-virtual-keyboard-policy="auto"
      :menuItems.prop="[]"
      :placeholder="PLACEHOLDERS[kind]"
      :aria-label="label"
      :disabled="disabled"
      @input="value = plain(($event.target as HTMLInputElement).value)"
    />
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

/* MathLive podświetla w aktywnym polu fragmenty tekstu, także słowa podpowiedzi („np.”,
   „albo”), co wyglądało jak zaznaczenie. W wyniku tekstu się nie wpisuje. */
.answer-input__field {
  --text-highlight-background-color: transparent;

  width: 100%;
  min-width: 0;
  min-height: 2.75rem;
  padding: 0.35em 0.5em;
  border: 1px solid var(--ink-soft);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--ink);
  font-size: 1.25rem;
}

.answer-input__field:focus-within {
  outline: 2px solid var(--ink);
  outline-offset: 1px;
}

/* Menu MathLive (macierze, kolory, tryby) nie jest potrzebne przy wyniku. Ikona klawiatury
   zostaje, bo na komputerze klawiatura wzorów nie otwiera się sama. */
.answer-input__field::part(menu-toggle) {
  display: none;
}

.answer-input__read {
  min-height: 1.5em;
  color: var(--ink-soft);
}
</style>
