<script setup lang="ts">
import { computed } from 'vue'
import { PRODUCT_NAME } from '@/config/product'
import { TABS, VARIANTS, type TabId } from '@/landing3/variants'

// Lista stron wizytówki 3.0, do wglądu za hasłem. Nie należy do ankiety.
const props = defineProps<{ tab: TabId }>()

const SCREENS = [
  { id: 'logowanie', name: 'Logowanie' },
  { id: 'mapa', name: 'Mapa tematów' },
  { id: 'zadanie', name: 'Zadanie' },
]

const active = computed(() => TABS.find((item) => item.id === props.tab)!)
</script>

<template>
  <main class="v3">
    <header class="v3__head">
      <p class="v3__brand">
        <RouterLink :to="{ name: 'home' }">{{ PRODUCT_NAME }}</RouterLink>
      </p>
      <h1 class="v3__title">Wizytówka 3.0</h1>
    </header>

    <nav class="v3__tabs" aria-label="Rodzaje stron">
      <RouterLink
        v-for="item in TABS"
        :key="item.id"
        class="v3__tab"
        :to="item.path"
        :aria-current="item.id === tab ? 'page' : undefined"
      >
        {{ item.name }}
        <span class="v3__count">{{ VARIANTS[item.id].length }}</span>
      </RouterLink>
    </nav>

    <p class="v3__lead">{{ active.lead }}</p>

    <ol class="v3__list">
      <li v-for="(page, index) in VARIANTS[tab]" :key="page.to" class="v3__item">
        <RouterLink
          class="v3__page"
          :to="page.to"
          :style="{ '--back': page.colors[0], '--mark': page.colors[1] }"
        >
          <span class="v3__swatch" aria-hidden="true">{{ index + 1 }}</span>
          <span class="v3__name">{{ page.name }}</span>
          <span class="v3__note">{{ page.note }}</span>
        </RouterLink>
        <p v-if="page.screens" class="v3__screens">
          Ekrany aplikacji w tym stylu:
          <RouterLink
            v-for="screen in SCREENS"
            :key="screen.id"
            :to="`/wizytowka3/${page.screens}/${screen.id}`"
          >
            {{ screen.name }}
          </RouterLink>
        </p>
      </li>
    </ol>
  </main>
</template>

<style scoped>
.v3 {
  display: grid;
  gap: clamp(1.25rem, 1rem + 1.5vw, 2rem);
  max-width: 46rem;
  margin-inline: auto;
  padding: clamp(2rem, 1rem + 5vw, 4.5rem) var(--gutter) 5rem;
}

.v3__head {
  display: grid;
  gap: 0.6rem;
}

.v3__brand {
  font-weight: 800;
  letter-spacing: -0.02em;
}

.v3__title {
  font-size: clamp(2.4rem, 1.6rem + 4vw, 4.25rem);
  font-weight: 830;
  font-stretch: 92%;
  letter-spacing: -0.035em;
  line-height: 0.96;
}

.v3__tabs {
  display: flex;
  gap: 0.35rem;
  padding: 0.3rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
}

.v3__tab {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.9rem;
  padding-inline: 0.5rem;
  border-radius: 999px;
  font-size: clamp(0.9375rem, 0.85rem + 0.4vw, 1.0625rem);
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.v3__tab[aria-current='page'] {
  background: var(--ink);
  color: var(--ground);
}

.v3__count {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  opacity: 0.75;
}

.v3__lead {
  max-width: 52ch;
  font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  line-height: 1.45;
}

.v3__list {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  list-style: none;
}

.v3__item {
  display: grid;
  gap: 0.35rem;
}

.v3__page {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.15rem 1rem;
  align-items: center;
  padding: 0.8rem 1.1rem 0.85rem 0.8rem;
  border-radius: 1.1rem;
  background: var(--surface);
  box-shadow:
    0 1px 1px rgb(29 31 34 / 0.06),
    0 8px 18px -10px rgb(29 31 34 / 0.25);
  text-decoration: none;
  transition: translate 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.v3__page:hover {
  translate: 0 -2px;
}

/* Próbka kolorów strony: tło i kolor wiodący wariantu. */
.v3__swatch {
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
  font-variant-numeric: tabular-nums;
}

.v3__name {
  align-self: end;
  font-size: 1.2rem;
  font-weight: 760;
  letter-spacing: -0.015em;
  line-height: 1.15;
}

.v3__note {
  align-self: start;
  color: var(--ink-soft);
  font-size: 0.9375rem;
  line-height: 1.35;
}

.v3__screens {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.9rem;
  align-items: center;
  padding-inline: 0.8rem;
  color: var(--ink-soft);
  font-size: 0.875rem;
}

.v3__screens a {
  display: inline-flex;
  align-items: center;
  min-height: 2.5rem;
  color: var(--ink);
  font-weight: 650;
}

@media (prefers-reduced-motion: reduce) {
  .v3__page {
    transition: none;
  }
}
</style>
