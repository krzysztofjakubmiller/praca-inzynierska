<script setup lang="ts">
import { computed } from 'vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import { EXAMS, type Exam } from '@/config/exams'
import { daysBetween, longDate, plural, shortDate } from '@/stats/stats'

const props = defineProps<{
  examId: Exam['id']
  /** Data matury w formacie RRRR-MM-DD. */
  examDate: string
  today: string
  target: number | null
}>()

const exam = computed(() => EXAMS.find((item) => item.id === props.examId)!)
const left = computed(() => Math.max(0, daysBetween(props.today, props.examDate)))

// Odcinek trasy od początku roku szkolnego do matury; przejechana część jest czarna.
const start = computed(() => `${Number(props.examDate.slice(0, 4)) - 1}-09-01`)
const travelled = computed(() => {
  const share = daysBetween(start.value, props.today) / daysBetween(start.value, props.examDate)
  return Math.min(1, Math.max(0, share))
})
</script>

<template>
  <section
    class="countdown"
    :style="{ '--marker-fill': `var(--exam-${examId})`, '--travelled': travelled }"
  >
    <h1 class="countdown__title">
      <template v-if="left > 0">
        <span class="countdown__days">{{ left }}</span
        >{{ ' ' }}
        <span class="countdown__unit">{{ plural(left, 'dzień', 'dni', 'dni') }} do matury</span>
      </template>
      <span v-else class="countdown__days">Matura dziś</span>
    </h1>
    <p class="countdown__meta">
      {{ exam.name }}, {{ longDate(examDate)
      }}<template v-if="target">, cel {{ target }}%</template>
    </p>
    <div class="countdown__route" aria-hidden="true">
      <span class="countdown__track" />
      <span class="countdown__travelled" />
      <span class="countdown__today" />
      <StationMarker class="countdown__exam" :shape="exam.solid" />
    </div>
    <p class="countdown__ends" aria-hidden="true">
      <span :class="{ countdown__hidden: travelled < 0.12 }">1 wrz</span>
      <span class="countdown__now">dziś</span>
      <span :class="{ countdown__hidden: travelled > 0.85 }">{{ shortDate(examDate) }}</span>
    </p>
  </section>
</template>

<style scoped>
.countdown {
  padding-block: 0.5rem 0.25rem;
}

.countdown__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.75rem;
}

.countdown__days {
  font-size: clamp(4rem, 2.6rem + 5.6vw, 6rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  font-variation-settings: 'wdth' 112;
  letter-spacing: -0.035em;
  line-height: 0.92;
}

.countdown__unit {
  font-size: clamp(1.3rem, 1.05rem + 1.1vw, 1.9rem);
  font-weight: 650;
  letter-spacing: -0.015em;
}

.countdown__meta {
  margin-top: 0.6rem;
  color: var(--ink-soft);
  font-size: 1rem;
}

/* Linia jak na mapie: 7 jednostek grubości, okrągłe końce, stacja Matura w kolorze egzaminu. */
.countdown__route {
  position: relative;
  height: 2rem;
  margin: 1.25rem 0.75rem 0 0.25rem;
}

.countdown__track,
.countdown__travelled {
  position: absolute;
  top: 50%;
  left: 0;
  height: 7px;
  border-radius: 999px;
  translate: 0 -50%;
}

.countdown__track {
  right: 0;
  background: var(--track);
}

.countdown__travelled {
  width: calc(var(--travelled) * 100%);
  background: var(--ink);
}

.countdown__today {
  position: absolute;
  top: 50%;
  left: calc(var(--travelled) * 100%);
  width: 1.375rem;
  height: 1.375rem;
  border: 2.5px solid var(--map-last);
  border-radius: 50%;
  translate: -50% -50%;
}

.countdown__exam {
  position: absolute;
  top: 50%;
  right: -0.75rem;
  font-size: 1.5rem;
  translate: 0 -50%;
}

.countdown__ends {
  position: relative;
  display: flex;
  justify-content: space-between;
  margin: 0.25rem 0.75rem 0 0.25rem;
  color: var(--ink-soft);
  font-size: 0.8125rem;
}

.countdown__hidden {
  visibility: hidden;
}

.countdown__now {
  position: absolute;
  left: calc(var(--travelled) * 100%);
  color: var(--ink);
  font-weight: 700;
  translate: -50% 0;
}
</style>
