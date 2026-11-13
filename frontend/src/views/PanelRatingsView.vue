<script setup lang="ts">
import { ref, watch } from 'vue'
import PanelTabs from '@/components/panel/PanelTabs.vue'
import { panelApi, type DifficultyRating } from '@/panel/api'
import { useProblems } from '@/panel/format'
import type { Rating } from '@/practice'
import '@/assets/panel.css'

const { problems, run } = useProblems()

const RATING_NAMES: Record<Rating, string> = {
  latwy: 'łatwe',
  sredni: 'średnie',
  trudny: 'trudne',
  'bardzo-trudny': 'bardzo trudne',
}

const changedOnly = ref(false)
const ratings = ref<DifficultyRating[]>([])

watch(
  changedOnly,
  (changed) =>
    run(async () => {
      ratings.value = await panelApi.ratings(changed)
    }),
  { immediate: true },
)

function when(moment: string) {
  return new Date(moment).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <main class="panel">
    <PanelTabs />

    <ul v-if="problems.length" class="panel__problems">
      <li v-for="problem in problems" :key="problem">{{ problem }}</li>
    </ul>

    <section class="panel__card">
      <div class="ratings__toolbar">
        <h2>Oceny trudności ({{ ratings.length }})</h2>
        <label class="ratings__check">
          <input v-model="changedOnly" type="checkbox" />
          Tylko zmienione po pomocy AI
        </label>
      </div>

      <div v-if="ratings.length" class="ratings__scroll">
        <table class="ratings">
          <thead>
            <tr>
              <th>Zadanie</th>
              <th>Uczeń</th>
              <th>Data</th>
              <th>Ocena ucznia</th>
              <th>Ocena do FSRS</th>
              <th>Uzasadnienie AI</th>
              <th>Wróci</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in ratings"
              :key="row.solution_id"
              :class="{ ratings__changed: row.rating !== row.student_rating }"
            >
              <td>
                <RouterLink :to="{ name: 'panel-task', params: { id: row.task_id } }">
                  id {{ row.task_id }}
                </RouterLink>
              </td>
              <td>{{ row.email }}</td>
              <td>{{ when(row.created_at) }}</td>
              <td>{{ RATING_NAMES[row.student_rating] }}</td>
              <td class="ratings__final">{{ RATING_NAMES[row.rating] }}</td>
              <td>{{ row.reason }}</td>
              <td>{{ row.due ? when(row.due) : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else>Brak ocen.</p>
    </section>
  </main>
</template>

<style scoped>
.ratings__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.panel .ratings__check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ratings__scroll {
  overflow-x: auto;
}

.ratings {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.ratings th,
.ratings td {
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid var(--hairline);
  text-align: left;
  vertical-align: top;
}

.ratings th {
  color: var(--ink-soft);
  font-weight: 650;
  white-space: nowrap;
}

.ratings td:nth-child(-n + 5),
.ratings td:last-child {
  white-space: nowrap;
}

.ratings__changed {
  background: var(--ground);
}

.ratings__changed .ratings__final {
  color: var(--panel-danger);
  font-weight: 700;
}
</style>
