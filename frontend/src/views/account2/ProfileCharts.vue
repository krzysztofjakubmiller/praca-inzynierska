<script setup lang="ts">
import ActivityHeatmap from '@/components/stats/ActivityHeatmap.vue'
import ForecastRange from '@/components/stats/ForecastRange.vue'
import LineProgress from '@/components/stats/LineProgress.vue'
import StatCard from '@/components/stats/StatCard.vue'
import WeekNumbers from '@/components/stats/WeekNumbers.vue'
import { LAST_SHEET, STATS, TARGET } from './demo'

// Te same cztery wykresy co na obecnym profilu; wersje konta różnią się tym, co jest wokół nich.
</script>

<template>
  <div class="profile-charts">
    <div class="profile-charts__grid">
      <StatCard
        v-slot="{ width }"
        class="profile-charts__wide"
        title="Ostatnie 4 tygodnie"
        note="Dni nauki z rzędu łączy linia. Liczby pod spodem dotyczą ostatnich 7 dni."
      >
        <WeekNumbers
          :days="STATS.days"
          :recent-score="STATS.recentScore"
          :today="STATS.today"
          :width="width"
        />
      </StatCard>
      <StatCard
        v-if="STATS.forecast"
        v-slot="{ width }"
        title="Prognoza wyniku"
        note="Szacunek na dzień matury, liczony z powtórek i wag działów."
      >
        <ForecastRange
          :forecast="STATS.forecast"
          :target="TARGET"
          :last-sheet="LAST_SHEET"
          :width="width"
        />
      </StatCard>
      <StatCard v-slot="{ width }" title="Kalendarz nauki" note="Kafelek to dzień.">
        <ActivityHeatmap :days="STATS.days" :today="STATS.today" :width="width" />
      </StatCard>
      <StatCard class="profile-charts__wide" title="Linie mapy">
        <LineProgress :lines="STATS.lines" />
      </StatCard>
    </div>
  </div>
</template>

<style scoped>
.profile-charts {
  container-type: inline-size;
}

.profile-charts__grid {
  display: grid;
  gap: 1rem;
}

/* Dwie kolumny zależą od miejsca na wykresy, a nie od ekranu: w wersji z biletem obok jest
   jeszcze kolumna z biletem. */
@container (min-width: 40rem) {
  .profile-charts__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-charts__wide {
    grid-column: 1 / -1;
  }
}
</style>
