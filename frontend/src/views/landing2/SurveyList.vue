<script setup lang="ts">
import { computed, ref } from 'vue'
import { PRODUCT_NAME } from '@/config/product'
import {
  PAGES,
  ROLES,
  answers,
  pageOrder,
  podium,
  role,
  savePodium,
  setRole,
  type PageId,
} from '@/landing2/survey'

// Miejsca na podium: tyle stron oceniający ustawia od najlepszej.
const PLACES = 3

const order = pageOrder()
const pages = order.map((id) => PAGES.find((page) => page.id === id)!)
const groups = [
  { id: 'glowne', title: '', note: '', pages: pages.filter((page) => page.main) },
  {
    id: 'dodatkowe',
    title: 'Dla chętnych: dwie dodatkowe',
    note: 'Nie musisz ich oceniać. Jeśli masz chwilę, zobacz je i napisz, co myślisz.',
    pages: pages.filter((page) => !page.main),
  },
]
const mainCount = groups[0]!.pages.length
const rated = computed(() => groups[0]!.pages.filter((page) => answers.value[page.id]).length)

const picked = ref<PageId[]>([...podium.value])
const state = ref<'idle' | 'sending' | 'saved' | 'failed'>(podium.value.length ? 'saved' : 'idle')

function place(id: PageId): number {
  return picked.value.indexOf(id) + 1
}

// Dotknięcie strony stawia ją na kolejnym wolnym miejscu, a drugie dotknięcie ją zdejmuje.
function pick(id: PageId) {
  if (place(id)) picked.value = picked.value.filter((other) => other !== id)
  else if (picked.value.length < PLACES) picked.value = [...picked.value, id]
  state.value = 'idle'
}

async function send() {
  state.value = 'sending'
  try {
    await savePodium(picked.value)
    state.value = 'saved'
  } catch {
    state.value = 'failed'
  }
}
</script>

<template>
  <main class="list">
    <header class="list__head">
      <p class="list__brand">{{ PRODUCT_NAME }}</p>
      <h1 class="list__title">Która strona jest najlepsza?</h1>
      <p class="list__lead">
        Szukamy wyglądu strony głównej. Najważniejsze jest {{ mainCount }} stron poniżej: obejrzyj
        je w dowolnej kolejności i oceń każdą. Na każdej w prawym dolnym rogu czeka dymek z trzema
        krótkimi pytaniami.
      </p>
    </header>

    <section class="who" aria-labelledby="who-title">
      <h2 id="who-title" class="who__title">Najpierw: kim jesteś?</h2>
      <div class="who__options" role="group" aria-labelledby="who-title">
        <button
          v-for="item in ROLES"
          :key="item.id"
          class="who__option"
          type="button"
          :aria-pressed="role === item.id"
          @click="setRole(item.id)"
        >
          {{ item.name }}
        </button>
      </div>
    </section>

    <p class="list__count" aria-live="polite">Ocenione: {{ rated }} z {{ mainCount }}</p>

    <section v-for="group in groups" :key="group.id" class="list__group">
      <h2 v-if="group.title" class="who__title">{{ group.title }}</h2>
      <p v-if="group.note" class="list__note">{{ group.note }}</p>
      <ol class="list__pages">
        <li v-for="page in group.pages" :key="page.id">
          <RouterLink
            class="page"
            :to="`/wizytowka/${page.id}`"
            :style="{ '--back': page.colors[0], '--mark': page.colors[1] }"
          >
            <span class="page__swatch" aria-hidden="true">{{ page.id }}</span>
            <span class="page__name">{{ page.name }}</span>
            <span v-if="answers[page.id]" class="page__state page__state--done">
              twoja ocena: {{ answers[page.id]!.looks }}/10
            </span>
            <span v-else class="page__state">do oceny</span>
          </RouterLink>
        </li>
      </ol>
    </section>

    <section v-if="rated >= 2" class="podium" aria-labelledby="podium-title">
      <h2 id="podium-title" class="podium__title">Na koniec: twoje podium</h2>
      <p class="list__lead">
        Dotknij najlepszej strony, potem drugiej i trzeciej. Możesz wybrać mniej niż trzy.
      </p>
      <ul class="podium__pages">
        <li v-for="page in pages" :key="page.id">
          <button
            class="podium__page"
            type="button"
            :aria-pressed="place(page.id) > 0"
            @click="pick(page.id)"
          >
            <span class="podium__place" aria-hidden="true">{{ place(page.id) || '' }}</span>
            {{ page.name }}
            <span v-if="place(page.id)" class="podium__sr">, miejsce {{ place(page.id) }}</span>
          </button>
        </li>
      </ul>
      <div class="podium__send">
        <button
          class="button"
          type="button"
          :disabled="!picked.length || state === 'sending' || state === 'saved'"
          @click="send"
        >
          {{ state === 'saved' ? 'Podium zapisane' : 'Zapisz podium' }}
        </button>
        <p v-if="state === 'failed'" class="podium__error" role="alert">
          Nie udało się zapisać. Spróbuj jeszcze raz.
        </p>
        <p v-if="state === 'saved'" class="podium__thanks">Dziękujemy za pomoc!</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.list {
  display: grid;
  gap: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
  max-width: 46rem;
  margin-inline: auto;
  padding: clamp(2rem, 1rem + 5vw, 5rem) var(--gutter) 6rem;
}

.list__head {
  display: grid;
  gap: 0.9rem;
}

.list__brand {
  font-weight: 800;
  letter-spacing: -0.02em;
}

.list__title {
  font-size: clamp(2.4rem, 1.6rem + 4vw, 4.25rem);
  font-weight: 830;
  font-stretch: 92%;
  letter-spacing: -0.035em;
  line-height: 0.96;
}

.list__lead {
  max-width: 52ch;
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.list__count {
  margin-bottom: -1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.who {
  display: grid;
  gap: 0.75rem;
}

.who__title {
  font-size: clamp(1.35rem, 1.15rem + 0.9vw, 1.8rem);
  font-weight: 780;
  letter-spacing: -0.02em;
}

.who__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.who__option {
  min-height: 2.9rem;
  padding: 0 1.25rem;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.who__option[aria-pressed='true'] {
  background: var(--ink);
  color: var(--ground);
}

.list__group {
  display: grid;
  gap: 0.75rem;
}

.list__note {
  max-width: 52ch;
  color: var(--ink-soft);
}

.list__pages {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
  gap: 0.75rem;
  padding: 0;
  list-style: none;
}

.page {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.1rem 0.9rem;
  align-items: center;
  padding: 0.75rem 1rem 0.75rem 0.75rem;
  border-radius: 1.1rem;
  background: var(--surface);
  box-shadow:
    0 1px 1px rgb(29 31 34 / 0.06),
    0 8px 18px -10px rgb(29 31 34 / 0.25);
  text-decoration: none;
  transition: translate 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.page:hover {
  translate: 0 -2px;
}

/* Próbka kolorów strony: tło i kolor wiodący wariantu. */
.page__swatch {
  display: grid;
  grid-row: span 2;
  place-items: center;
  width: 3.4rem;
  height: 3.4rem;
  border: 1px solid var(--hairline);
  border-radius: 0.8rem;
  background: var(--back);
  color: var(--mark);
  font-size: 1.5rem;
  font-weight: 850;
  text-transform: uppercase;
}

.page__name {
  font-size: 1.15rem;
  font-weight: 760;
  letter-spacing: -0.015em;
  line-height: 1.15;
}

.page__state {
  color: var(--ink-soft);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.page__state--done {
  color: var(--correct);
  font-weight: 650;
}

.podium {
  display: grid;
  gap: 1rem;
  padding-top: clamp(1.5rem, 1rem + 2vw, 2.5rem);
  border-top: 1px solid var(--hairline);
}

.podium__title {
  font-size: clamp(1.7rem, 1.3rem + 1.8vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.podium__pages {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0;
  list-style: none;
}

.podium__page {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.9rem;
  padding: 0 1rem 0 0.45rem;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.podium__place {
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  border: 2px dashed var(--ink-soft);
  border-radius: 50%;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.podium__page[aria-pressed='true'] {
  background: var(--ink);
  color: var(--ground);
}

.podium__page[aria-pressed='true'] .podium__place {
  border: 0;
  background: var(--ground);
  color: var(--ink);
}

.podium__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.podium__send {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}

.podium__error {
  color: var(--danger);
  font-weight: 600;
}

.podium__thanks {
  font-weight: 650;
}

@media (prefers-reduced-motion: reduce) {
  .page {
    transition: none;
  }
}
</style>
