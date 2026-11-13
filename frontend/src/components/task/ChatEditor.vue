<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import 'mathlive/fonts.css'
import AppIcon from '@/components/AppIcon.vue'
import { loadMathLive } from '@/mathKeyboard'

// Wiadomość do Dyżurnego w jednym polu: tekst z klawiatury telefonu, a wzory z klawiatury
// matematycznej, każdy w osobnym wierszu. Na zewnątrz jeden tekst ze wzorami w $...$,
// wiersze rozdzielone pojedynczym enterem.
defineProps<{ placeholder: string }>()
const model = defineModel<string>({ required: true })
const emit = defineEmits<{ photo: [file: File] }>()

type Row = { id: number; kind: 'tekst' | 'wzor'; value: string }

let nextId = 1
const rows = ref<Row[]>([{ id: 0, kind: 'tekst', value: '' }])
const ready = ref(false)
const root = useTemplateRef<HTMLElement>('root')

watch(
  rows,
  (value) => {
    model.value = value
      .filter((row) => row.value.trim())
      .map((row) => (row.kind === 'wzor' ? `$${row.value}$` : row.value.trim()))
      .join('\n')
  },
  { deep: true },
)

onMounted(async () => {
  await loadMathLive()
  ready.value = true
})

async function focusRow(id: number | undefined) {
  await nextTick()
  root.value?.querySelector<HTMLElement>(`[data-row="${id}"]`)?.focus()
}

// Wzór staje pod ostatnim tekstem, a pod nim zawsze jest wiersz na dalszy tekst. Pusty
// ostatni wiersz tekstu zostaje pod wzorem, żeby nad wzorem nie było dziury.
function addFormula() {
  const formula: Row = { id: nextId++, kind: 'wzor', value: '' }
  const last = rows.value[rows.value.length - 1]!
  if (last.kind === 'tekst' && !last.value.trim()) {
    rows.value.splice(rows.value.length - 1, 0, formula)
  } else {
    rows.value.push(formula, { id: nextId++, kind: 'tekst', value: '' })
  }
  focusRow(formula.id)
}

// Pusty wzór znika, gdy uczeń przejdzie do tekstu, a teksty nad nim i pod nim łączą się
// w jeden wiersz. Tylko wtedy: MathLive przy pokazywaniu klawiatury sam przestawia fokus
// w środku pola i usunięcie pola w tym momencie psuło klawiaturę.
function leaveFormula(row: Row, event: FocusEvent) {
  const next = event.relatedTarget
  if (row.value.trim() || !(next instanceof HTMLTextAreaElement)) return
  if (!root.value?.contains(next)) return
  const index = rows.value.indexOf(row)
  const before = rows.value[index - 1]
  const after = rows.value[index + 1]
  if (before?.kind === 'tekst' && after?.kind === 'tekst') {
    before.value = [before.value, after.value].filter((text) => text.trim()).join('\n')
    rows.value.splice(index, 2)
  } else {
    rows.value.splice(index, 1)
  }
}

// Wartość pola czyści się, żeby to samo zdjęcie dało się wybrać jeszcze raz.
function pick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) emit('photo', file)
}
</script>

<template>
  <div ref="root" class="chat-editor">
    <div class="chat-editor__rows">
      <template v-for="(row, index) in rows" :key="row.id">
        <textarea
          v-if="row.kind === 'tekst'"
          v-model="row.value"
          :data-row="row.id"
          class="chat-editor__text"
          rows="1"
          :placeholder="rows.length === 1 ? placeholder : ''"
          :aria-label="rows.length === 1 ? placeholder : `Wiersz ${index + 1}: tekst`"
        />
        <math-field
          v-else-if="ready"
          :data-row="row.id"
          class="chat-editor__formula"
          math-virtual-keyboard-policy="auto"
          :menuItems.prop="[]"
          :aria-label="`Wiersz ${index + 1}: wzór`"
          :value="row.value"
          @input="row.value = ($event.target as HTMLInputElement).value"
          @focusout="leaveFormula(row, $event)"
          @keydown.enter.prevent="focusRow(rows[index + 1]?.id)"
        />
      </template>
    </div>
    <div class="chat-editor__tools">
      <!-- Przeglądarka nie pozwala ostylować pola pliku, więc klikana jest ikona wokół niego. -->
      <label class="chat-editor__tool" title="Zdjęcie z galerii">
        <input type="file" accept="image/*" class="chat-editor__file" @change="pick" />
        <AppIcon name="image" />
        <span class="chat-editor__spoken">Zdjęcie z galerii</span>
      </label>
      <label class="chat-editor__tool" title="Zrób zdjęcie">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          class="chat-editor__file"
          @change="pick"
        />
        <AppIcon name="camera" />
        <span class="chat-editor__spoken">Zrób zdjęcie</span>
      </label>
      <button type="button" class="chat-editor__tool" title="Dodaj wzór" @click="addFormula">
        <span class="chat-editor__fx" aria-hidden="true">f(x)</span>
        <span class="chat-editor__spoken">Dodaj wzór</span>
      </button>
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.chat-editor {
  border: 2px solid var(--hairline);
  border-radius: 1.25rem;
  background: var(--surface);
}

.chat-editor:focus-within {
  border-color: var(--ink);
}

/* Kolumna nie rośnie od długiego wzoru; wzór przewija się w swoim polu, a nie wystaje
   poza czat, który ucina wszystko w bok. */
.chat-editor__rows {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding: 0.5rem 0.875rem 0;
}

/* field-sizing: pole rośnie z tekstem, bez własnego suwaka. */
.chat-editor__text {
  width: 100%;
  min-height: 1.5em;
  padding: 0.25rem 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  line-height: 1.5;
  resize: none;
  outline: none;
  field-sizing: content;
}

.chat-editor__formula {
  width: 100%;
  min-width: 0;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  background: var(--track);
  color: var(--ink);
  font-size: 1.25rem;
  outline: none;
}

/* Menu MathLive (macierze, kolory, tryby) nie jest potrzebne do matury, a na telefonie łatwo
   je otworzyć zamiast pisać; puste menuItems wyłącza je też przy długim przytrzymaniu.
   Ikona klawiatury też jest zbędna, bo klawiatura wzorów otwiera się po stuknięciu w pole. */
.chat-editor__formula::part(menu-toggle),
.chat-editor__formula::part(virtual-keyboard-toggle) {
  display: none;
}

.chat-editor__tools {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.375rem 0.375rem;
}

.chat-editor__tool {
  position: relative;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  cursor: pointer;
}

.chat-editor__tool:hover {
  background: var(--hairline);
  color: var(--ink);
}

.chat-editor__tool:has(.chat-editor__file:focus-visible) {
  outline: 2px solid var(--ink);
}

.chat-editor__fx {
  font-family: 'KaTeX_Math', serif;
  font-size: 1.125rem;
  font-style: italic;
}

/* Pole zostaje w dokumencie, żeby działało z klawiatury i czytnika ekranu. */
.chat-editor__file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.chat-editor__spoken {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
