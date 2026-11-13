<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

// Strona zadania i strona szablonu należą do zakładek z listami, z których się na nie wchodzi.
const TABS = [
  { label: 'Zadania', name: 'panel', pages: ['panel', 'panel-task'] },
  { label: 'Warianty', name: 'panel-templates', pages: ['panel-templates', 'panel-template'] },
  { label: 'Oceny AI', name: 'panel-ai-grades', pages: ['panel-ai-grades'] },
  { label: 'Oceny trudności', name: 'panel-ratings', pages: ['panel-ratings'] },
]

// Plan prac to osobna strona; jej adres jest w zmiennej środowiskowej.
const PLAN_URL = import.meta.env.VITE_PLAN_URL
</script>

<template>
  <nav class="panel-tabs" aria-label="Panel">
    <RouterLink
      v-for="tab in TABS"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="panel-tabs__tab"
      :class="{ 'panel-tabs__tab--active': tab.pages.includes(String(route.name)) }"
    >
      {{ tab.label }}
    </RouterLink>
    <a v-if="PLAN_URL" :href="PLAN_URL" target="_blank" rel="noopener" class="panel-tabs__tab">
      Plan
    </a>
  </nav>
</template>

<style scoped>
.panel-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid var(--hairline);
}

.panel-tabs__tab {
  padding: 0.6rem 1rem;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  color: var(--ink-soft);
  font-weight: 650;
  text-decoration: none;
}

.panel-tabs__tab:hover {
  color: var(--ink);
}

.panel-tabs__tab--active {
  border-bottom-color: var(--ink);
  color: var(--ink);
}
</style>
