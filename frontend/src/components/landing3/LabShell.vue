<script setup lang="ts">
import { computed } from 'vue'
import { MAP_VARIANTS, TICKET_VARIANTS } from '@/landing3/variants'

// Rama strony z jednym wariantem sekcji: nazwa wariantu i przejście do sąsiednich.
const props = defineProps<{ kind: 'mapa' | 'bilet'; variant: string }>()

const list = computed(() => (props.kind === 'mapa' ? MAP_VARIANTS : TICKET_VARIANTS))
const index = computed(() => Number(props.variant) - 1)
const current = computed(() => list.value[index.value]!)
const previous = computed(() => list.value[index.value - 1])
const next = computed(() => list.value[index.value + 1])
</script>

<template>
  <div class="lab">
    <header class="lab__top">
      <RouterLink class="lab__back" :to="`/wizytowka3/${kind}`">Wizytówka 3.0</RouterLink>
      <p class="lab__name">
        {{ kind === 'mapa' ? 'Mapa tematów' : 'Bilet' }} {{ variant }} z {{ list.length }}:
        <strong>{{ current.name }}</strong>
      </p>
      <nav class="lab__nav" aria-label="Sąsiednie warianty">
        <RouterLink v-if="previous" :to="previous.to">Poprzedni</RouterLink>
        <RouterLink v-if="next" :to="next.to">Następny</RouterLink>
      </nav>
    </header>
    <main class="lab__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.lab {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  /* Bilet zabrany z kasownika wylatuje poza sekcję; strona przycina go na swoim brzegu. */
  overflow: clip;
}

.lab__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 1.25rem;
  min-height: var(--header-h);
  padding: 0.25rem var(--gutter);
  border-bottom: 1px solid var(--hairline);
  background: var(--ground);
  font-size: 0.9375rem;
}

.lab__back {
  font-weight: 800;
}

.lab__name {
  margin-right: auto;
  color: var(--ink-soft);
}

.lab__name strong {
  color: var(--ink);
  font-weight: 700;
}

.lab__nav {
  display: flex;
  gap: 1.25rem;
  font-weight: 650;
}

.lab__top a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
}

.lab__main {
  display: grid;
  flex: 1;
}
</style>
