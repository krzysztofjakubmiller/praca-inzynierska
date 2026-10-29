<script setup lang="ts">
import { computed, ref } from 'vue'
import SolutionEditor from '@/components/task/SolutionEditor.vue'
import { shrinkPhoto, toBase64 } from '@/photo'
import { gradeSolution, Rejected, type Attempt, type Graded, type PracticeMode } from '@/practice'

// Ocena rozwiązania przez AI: zdjęcie zeszytu, obraz tablicy albo opis z równaniami.
const props = defineProps<{
  taskId: number
  mode: PracticeMode
  // Wpisane wcześniej wyniki końcowe; przy dowodzie pusta lista.
  answers: string[]
  whiteboard: () => Promise<Blob | null>
}>()

const emit = defineEmits<{ graded: [result: Graded] }>()

type Source = 'zdjecie' | 'tablica' | 'opis'
const SOURCES: { source: Source; name: string }[] = [
  { source: 'zdjecie', name: 'Zdjęcie' },
  { source: 'tablica', name: 'Tablica' },
  { source: 'opis', name: 'Opis' },
]

const source = ref<Source>('zdjecie')
const photo = ref<File | null>(null)
const text = ref('')
const busy = ref(false)
const problems = ref<string[]>([])

const ready = computed(() => {
  if (source.value === 'zdjecie') return photo.value !== null
  if (source.value === 'opis') return text.value.trim() !== ''
  return true
})

async function attempt(): Promise<Attempt> {
  if (source.value === 'opis') return { text: text.value }
  if (source.value === 'tablica') {
    const board = await props.whiteboard()
    if (!board) throw new Rejected(0, ['Nie udało się pobrać obrazu tablicy.'])
    return { image: await toBase64(board), image_type: 'image/png' }
  }
  const shrunk = await shrinkPhoto(photo.value!).catch(() => {
    throw new Rejected(0, ['Nie udało się wczytać zdjęcia. Zrób je jeszcze raz aparatem.'])
  })
  return { image: await toBase64(shrunk), image_type: 'image/jpeg' }
}

async function send() {
  busy.value = true
  problems.value = []
  try {
    emit('graded', await gradeSolution(props.taskId, props.mode, props.answers, await attempt()))
  } catch (error) {
    problems.value =
      error instanceof Rejected
        ? error.problems
        : ['Nie udało się wysłać rozwiązania. Spróbuj jeszcze raz.']
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="ai-grade">
    <h3 class="ai-grade__title">Wyślij rozwiązanie, AI je oceni i powie, co poszło nie tak</h3>
    <div class="ai-grade__sources">
      <button
        v-for="option in SOURCES"
        :key="option.source"
        type="button"
        class="button button--quiet"
        :aria-pressed="source === option.source"
        @click="source = option.source"
      >
        {{ option.name }}
      </button>
    </div>
    <input
      v-if="source === 'zdjecie'"
      type="file"
      accept="image/*"
      aria-label="Zdjęcie rozwiązania"
      @change="photo = ($event.target as HTMLInputElement).files?.[0] ?? null"
    />
    <p v-else-if="source === 'tablica'" class="ai-grade__hint">
      Wyślemy to, co jest teraz na tablicy przy zadaniu.
    </p>
    <SolutionEditor
      v-else
      v-model="text"
      placeholder="Opisz rozwiązanie. Wzory dodasz przyciskiem „+ równanie”."
    />
    <button type="button" class="button ai-grade__send" :disabled="!ready || busy" @click="send">
      {{ busy ? 'AI sprawdza, to może potrwać do pół minuty' : 'Oceń rozwiązanie' }}
    </button>
    <p v-for="problem in problems" :key="problem" class="ai-grade__problem" role="alert">
      {{ problem }}
    </p>
  </section>
</template>

<style scoped>
.ai-grade {
  display: grid;
  gap: 0.75rem;
}

.ai-grade__title {
  font-size: 1.0625rem;
  font-weight: 700;
}

.ai-grade__sources {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ai-grade__sources [aria-pressed='true'] {
  border-color: var(--ink);
}

.ai-grade__hint {
  color: var(--ink-soft);
}

.ai-grade__send {
  justify-self: start;
}

.ai-grade__problem {
  color: var(--danger);
  font-weight: 600;
}
</style>
