<script setup lang="ts">
import { computed } from 'vue'
import ActivityHeatmap from '@/components/stats/ActivityHeatmap.vue'
import DailyTasks from '@/components/stats/DailyTasks.vue'
import ForecastRange from '@/components/stats/ForecastRange.vue'
import LineProgress from '@/components/stats/LineProgress.vue'
import ReviewsAhead from '@/components/stats/ReviewsAhead.vue'
import RouteToExam from '@/components/stats/RouteToExam.vue'
import SheetResults from '@/components/stats/SheetResults.vue'
import StatCard from '@/components/stats/StatCard.vue'
import StreakRoute from '@/components/stats/StreakRoute.vue'
import TopicStates from '@/components/stats/TopicStates.vue'
import WeakTopics from '@/components/stats/WeakTopics.vue'
import WeekNumbers from '@/components/stats/WeekNumbers.vue'
import type { ProgressStats } from '@/stats/stats'

const props = defineProps<{
  stats: ProgressStats
  target: number | null
  /** Najwięcej powtórek jednego dnia. */
  limit: number
}>()

const lastSheet = computed(() => {
  const done = props.stats.sheets.filter((sheet) => sheet.percent !== undefined)
  return done[done.length - 1]?.percent
})
</script>

<template>
  <div class="progress-charts">
    <section class="progress-charts__group" aria-labelledby="group-activity">
      <h2 id="group-activity" class="progress-charts__heading">Aktywność</h2>
      <div class="progress-charts__grid">
        <StatCard
          v-slot="{ width }"
          class="progress-charts__wide"
          title="Ostatnie 7 dni"
          :level="3"
        >
          <WeekNumbers
            :days="stats.days"
            :recent-score="stats.recentScore"
            :today="stats.today"
            :width="width"
          />
        </StatCard>
        <StatCard
          v-slot="{ width }"
          title="Kalendarz nauki"
          note="Kafelek to dzień. Im ciemniejszy, tym więcej zadań."
          :level="3"
        >
          <ActivityHeatmap :days="stats.days" :today="stats.today" :width="width" />
        </StatCard>
        <StatCard
          v-slot="{ width }"
          title="Seria"
          note="Ostatnie 4 tygodnie wężykiem. Dni nauki z rzędu łączy linia."
          :level="3"
        >
          <StreakRoute :days="stats.days" :today="stats.today" :width="width" />
        </StatCard>
        <StatCard
          v-slot="{ width }"
          class="progress-charts__wide"
          title="Zadania dzień po dniu"
          note="Ostatnie 30 dni. Szare kropki to dni bez nauki."
          :level="3"
        >
          <DailyTasks :days="stats.days" :today="stats.today" :width="width" />
        </StatCard>
      </div>
    </section>

    <section class="progress-charts__group" aria-labelledby="group-map">
      <h2 id="group-map" class="progress-charts__heading">Mapa</h2>
      <div class="progress-charts__grid">
        <StatCard
          class="progress-charts__tall"
          title="Linie mapy"
          note="Ile zadań zrobione na każdej linii i ile jeszcze zostało."
          :level="3"
        >
          <LineProgress :lines="stats.lines" />
        </StatCard>
        <StatCard
          v-slot="{ width }"
          title="Stany tematów"
          note="Tak jak na mapie: opanowane, w nauce, słabe i nieruszone."
          :level="3"
        >
          <TopicStates :states="stats.states" :width="width" />
        </StatCard>
        <StatCard
          title="Najsłabsze tematy"
          note="Najniższa skuteczność w ostatnich wariantach. Warto do nich wrócić."
          :level="3"
        >
          <WeakTopics :topics="stats.weakest" />
        </StatCard>
      </div>
    </section>

    <section class="progress-charts__group" aria-labelledby="group-reviews">
      <h2 id="group-reviews" class="progress-charts__heading">Powtórki</h2>
      <div class="progress-charts__grid">
        <StatCard
          v-slot="{ width }"
          class="progress-charts__wide"
          title="Najbliższe 2 tygodnie"
          note="Ponad dzienny limit powtórki czekają na kolejne dni jak pasażerowie na stacji. Limit zmienisz w ustawieniach."
          :level="3"
        >
          <ReviewsAhead
            :reviews="stats.reviewsAhead"
            :overdue="stats.overdue"
            :limit="limit"
            :today="stats.today"
            :width="width"
          />
        </StatCard>
      </div>
    </section>

    <section class="progress-charts__group" aria-labelledby="group-sheets">
      <h2 id="group-sheets" class="progress-charts__heading">Arkusze i matura</h2>
      <div class="progress-charts__grid">
        <StatCard
          v-slot="{ width }"
          title="Wyniki arkuszy"
          note="Kolejne arkusze na tle progu zdania i twojego celu."
          :level="3"
        >
          <SheetResults :sheets="stats.sheets" :target="target" :width="width" />
        </StatCard>
        <StatCard
          v-slot="{ width }"
          title="Prognoza wyniku"
          note="Szacunek na dzień matury, liczony z powtórek i wag działów."
          :level="3"
        >
          <ForecastRange
            :forecast="stats.forecast"
            :target="target"
            :last-sheet="lastSheet"
            :width="width"
          />
        </StatCard>
        <StatCard
          v-slot="{ width }"
          class="progress-charts__wide"
          title="Trasa do matury"
          note="Arkusze za tobą i przed tobą, od początku roku szkolnego."
          :level="3"
        >
          <RouteToExam
            :sheets="stats.sheets"
            :today="stats.today"
            :exam-date="stats.examDate"
            :exam-id="stats.examId"
            :width="width"
          />
        </StatCard>
      </div>
    </section>
  </div>
</template>

<style scoped>
.progress-charts {
  display: grid;
  gap: 2.5rem;
  container-type: inline-size;
}

.progress-charts__group {
  display: grid;
  gap: 0.875rem;
}

.progress-charts__heading {
  font-size: 1.375rem;
  font-weight: 750;
  font-variation-settings: 'wdth' 90;
  letter-spacing: -0.015em;
}

.progress-charts__grid {
  display: grid;
  gap: 0.75rem;
}

@container (min-width: 44rem) {
  .progress-charts__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .progress-charts__wide {
    grid-column: 1 / -1;
  }

  .progress-charts__tall {
    grid-row: span 2;
  }
}
</style>
