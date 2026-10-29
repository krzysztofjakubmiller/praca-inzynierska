<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import 'mathlive/fonts.css'
import { loadMathLive } from '@/mathKeyboard'

// Rozwiązanie albo pytanie jako lista wierszy, jak w Desmosie: zwykły tekst z klawiatury
// telefonu albo równanie z klawiatury matematycznej. Na zewnątrz jeden tekst ze wzorami w $...$.
defineProps<{ placeholder: string }>()
const model = defineModel<string>({ required: true })

type Row = { id: number; kind: 'tekst' | 'rownanie'; value: string }

let nextId = 1
const rows = ref<Row[]>([{ id: 0, kind: 'tekst', value: '' }])
const ready = ref(false)
const root = useTemplateRef<HTMLElement>('root')

watch(
  rows,
  (value) => {
    model.value = value
      .filter((row) => row.value.trim())
      .map((row) => (row.kind === 'rownanie' ? `$${row.value}$` : row.value.trim()))
      .join('\n')
  },
  { deep: true },
)

onMounted(async () => {
  await loadMathLive()
  ready.value = true
})

async function add(kind: Row['kind']) {
  rows.value.push({ id: nextId++, kind, value: '' })
  await nextTick()
  root.value?.querySelector<HTMLElement>('.solution-editor__row:last-of-type .solution-editor__field')?.focus()
}
</script>

<template>
  <div ref="root" class="solution-editor">
    <div v-for="(row, index) in rows" :key="row.id" class="solution-editor__row">
      <textarea
        v-if="row.kind === 'tekst'"
        v-model="row.value"
        class="solution-editor__field solution-editor__text"
        rows="2"
        :placeholder="index === 0 ? placeholder : ''"
        :aria-label="`Wiersz ${index + 1}: tekst`"
      />
      <math-field
        v-else-if="ready"
        class="solution-editor__field solution-editor__math"
        math-virtual-keyboard-policy="auto"
        :aria-label="`Wiersz ${index + 1}: równanie`"
        :value="row.value"
        @input="row.value = ($event.target as HTMLInputElement).value"
      />
      <button
        v-if="rows.length > 1"
        type="button"
        class="button button--quiet solution-editor__remove"
        :aria-label="`Usuń wiersz ${index + 1}`"
        @click="rows.splice(index, 1)"
      >
        ×
      </button>
    </div>
    <div class="solution-editor__add">
      <button type="button" class="button button--quiet" @click="add('tekst')">+ tekst</button>
      <button type="button" class="button button--quiet" @click="add('rownanie')">+ równanie</button>
    </div>
  </div>
</template>

<style scoped>
.solution-editor {
  display: grid;
  gap: 0.5rem;
}

.solution-editor__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.5rem;
}

.solution-editor__field {
  grid-column: 1;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--hairline);
  border-radius: 0.75rem;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
}

.solution-editor__text {
  resize: vertical;
}

.solution-editor__math {
  font-size: 1.25rem;
}

.solution-editor__remove {
  grid-column: 2;
}

.solution-editor__add {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
