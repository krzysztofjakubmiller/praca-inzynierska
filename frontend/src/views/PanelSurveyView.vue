<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PanelTabs from '@/components/panel/PanelTabs.vue'
import { LIKERT, PAGES } from '@/landing2/survey'
import { panelApi, type SurveyResults } from '@/panel/api'
import { useProblems } from '@/panel/format'
import '@/assets/panel.css'

// Punkty za miejsca na podium: pierwsze, drugie, trzecie.
const PODIUM_POINTS = [3, 2, 1]

const { problems, run } = useProblems()
const results = ref<SurveyResults>({ answers: [], podiums: [] })

onMounted(() =>
  run(async () => {
    results.value = await panelApi.survey()
  }),
)

function average(values: number[]): string {
  if (!values.length) return ''
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return mean.toLocaleString('pl-PL', { maximumFractionDigits: 1 })
}

const devices = computed(() => new Set(results.value.answers.map((row) => row.device_id)).size)

// Jedna linia na wizytówkę, od najwyżej ocenianej.
const summary = computed(() =>
  PAGES.map((page) => {
    const rows = results.value.answers.filter((row) => row.page === page.id)
    const points = results.value.podiums.reduce((sum, podium) => {
      const place = podium.pages.indexOf(page.id)
      return sum + (PODIUM_POINTS[place] ?? 0)
    }, 0)
    const looks = rows.map((row) => row.looks)
    return {
      ...page,
      count: rows.length,
      looksMean: looks.length ? looks.reduce((sum, value) => sum + value, 0) / looks.length : 0,
      looks: average(looks),
      expensive: average(rows.map((row) => row.expensive)),
      buying: average(rows.map((row) => row.buying)),
      scrolled: average(rows.map((row) => row.scrolled)),
      seconds: average(rows.map((row) => row.seconds)),
      points,
    }
  }).sort((first, second) => second.looksMean - first.looksMean),
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
      <h2>Wizytówki ({{ results.answers.length }} ocen z {{ devices }} urządzeń)</h2>
      <p class="survey__note">
        Wygląd w skali 1–10, „drogo” i „zakup” w skali 1–5 (1 to „zdecydowanie nie”). Podium: 3
        punkty za pierwsze miejsce, 2 za drugie, 1 za trzecie.
      </p>
      <div class="survey__scroll">
        <table class="survey">
          <thead>
            <tr>
              <th>Strona</th>
              <th>Ocen</th>
              <th>Wygląd</th>
              <th>Drogo</th>
              <th>Zakup</th>
              <th>Podium</th>
              <th>Przewinięte %</th>
              <th>Sekund</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary" :key="row.id">
              <td>
                <RouterLink :to="`/wizytowka/${row.id}`">
                  {{ row.id.toUpperCase() }}. {{ row.name }}
                </RouterLink>
              </td>
              <td>{{ row.count }}</td>
              <td class="survey__main">{{ row.looks }}</td>
              <td>{{ row.expensive }}</td>
              <td>{{ row.buying }}</td>
              <td>{{ row.points || '' }}</td>
              <td>{{ row.scrolled }}</td>
              <td>{{ row.seconds }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel__card">
      <h2>Wszystkie oceny</h2>
      <div v-if="results.answers.length" class="survey__scroll">
        <table class="survey">
          <thead>
            <tr>
              <th>Strona</th>
              <th>Wygląd</th>
              <th>Drogo</th>
              <th>Zakup</th>
              <th>Komentarz</th>
              <th>Urządzenie</th>
              <th>Przewinięte</th>
              <th>Czas</th>
              <th>Zadanie próbne</th>
              <th>Kliknięcia w przyciski</th>
              <th>Ankieta</th>
              <th>Kolejność</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in results.answers" :key="row.device_id + row.page">
              <td>{{ row.page.toUpperCase() }}</td>
              <td class="survey__main">{{ row.looks }}</td>
              <td>{{ LIKERT[row.expensive - 1] }}</td>
              <td>{{ LIKERT[row.buying - 1] }}</td>
              <td class="survey__comment">{{ row.comment }}</td>
              <td>
                {{ row.device }}
                <span class="survey__soft">
                  {{
                    [row.details.model, row.details.system, row.details.screen]
                      .filter(Boolean)
                      .join(', ')
                  }}
                </span>
              </td>
              <td>{{ row.scrolled }}%</td>
              <td>{{ row.seconds }} s</td>
              <td>{{ row.details.tried_task ? 'tak' : 'nie' }}</td>
              <td>{{ row.details.blocked_clicks }}</td>
              <td>{{ row.details.opened_by === 'klik' ? 'z dymka' : 'na końcu strony' }}</td>
              <td>{{ row.details.order }}</td>
              <td>{{ when(row.updated_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else>Brak ocen.</p>
    </section>
  </main>
</template>

<style scoped>
.survey__note {
  max-width: 70ch;
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.survey__scroll {
  overflow-x: auto;
}

.survey {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.survey th,
.survey td {
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid var(--hairline);
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
}

.survey th {
  color: var(--ink-soft);
  font-weight: 650;
}

.survey__main {
  font-weight: 750;
}

.survey td.survey__comment {
  min-width: 16rem;
  white-space: normal;
}

.survey__soft {
  display: block;
  color: var(--ink-soft);
  font-size: 0.8rem;
}
</style>
