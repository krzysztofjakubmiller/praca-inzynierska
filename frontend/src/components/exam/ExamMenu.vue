<script setup lang="ts">
import { useId } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import StationMarker from '@/components/landing/StationMarker.vue'
import { EXAMS, type Exam } from '@/config/exams'

const emit = defineEmits<{
  navigate: []
}>()

interface MenuItem {
  label: string
  to: RouteLocationRaw
  exam?: Exam
}

// Dopóki te strony nie powstaną, pozycje menu prowadzą do strony „Wkrótce”.
const SOON: RouteLocationRaw = { name: 'coming-soon' }
const EXAM_PAGES: Partial<Record<Exam['id'], RouteLocationRaw>> = {
  'matura-podstawowa': { name: 'basic-matura' },
  'matura-rozszerzona': { name: 'extended-matura' },
}

const soon = (label: string): MenuItem => ({ label, to: SOON })

const GROUPS: { title: string; items: MenuItem[] }[] = [
  { title: 'Dziś', items: ['Powtórki', 'Praca domowa', 'Kontynuuj'].map(soon) },
  { title: 'Ćwiczenia', items: ['Tryb losowy', 'Moje zestawy'].map(soon) },
  { title: 'Arkusze', items: ['Arkusz diagnostyczny', 'Arkusz równoległy'].map(soon) },
  { title: 'Postęp', items: ['Prognoza wyniku'].map(soon) },
  { title: 'Materiały', items: ['Moje materiały'].map(soon) },
  {
    title: 'Egzaminy',
    items: EXAMS.map((exam) => ({ label: exam.name, to: EXAM_PAGES[exam.id] ?? SOON, exam })),
  },
  { title: 'Konto', items: ['Profil', 'Bilet', 'Ustawienia', 'Wyloguj'].map(soon) },
]

const id = useId()
</script>

<template>
  <nav class="exam-menu" aria-label="Menu">
    <div v-for="(group, index) in GROUPS" :key="group.title" class="exam-menu__group">
      <h2 :id="`${id}-${index}`" class="exam-menu__title">{{ group.title }}</h2>
      <ul class="exam-menu__list" :aria-labelledby="`${id}-${index}`">
        <li v-for="item in group.items" :key="item.label">
          <RouterLink
            class="exam-menu__link"
            :to="item.to"
            :style="item.exam && { '--marker-fill': `var(--exam-${item.exam.id})` }"
            @click="emit('navigate')"
          >
            <StationMarker v-if="item.exam" :shape="item.exam.solid" class="exam-menu__marker" />
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.exam-menu {
  display: grid;
  gap: 1.25rem;
}

.exam-menu__title {
  margin-bottom: 0.25rem;
  padding-inline: 0.75rem;
  color: var(--ink-soft);
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1.5rem;
}

.exam-menu__list {
  padding: 0;
  list-style: none;
}

.exam-menu__link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 2.75rem;
  padding-inline: 0.75rem;
  border-radius: 999px;
  color: var(--ink);
  font-size: 1rem;
  font-weight: 550;
  line-height: 1.2;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.exam-menu__link:hover {
  background: var(--hairline);
}

.exam-menu__link[aria-current='page'] {
  font-weight: 700;
}

.exam-menu__marker {
  font-size: 1.1rem;
}

@media (pointer: fine) {
  .exam-menu__link {
    min-height: 2.25rem;
  }
}
</style>
