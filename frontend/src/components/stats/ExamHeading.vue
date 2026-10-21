<script setup lang="ts">
import { computed } from 'vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import { EXAMS, type Exam } from '@/config/exams'

const props = defineProps<{
  examId: Exam['id']
  /** Trasa tej samej strony dla drugiego egzaminu; bez niej link się nie pojawia. */
  otherRoute?: string
}>()

const exam = computed(() => EXAMS.find((item) => item.id === props.examId)!)
const other = computed(() =>
  EXAMS.find(
    (item) =>
      item.id ===
      (props.examId === 'matura-podstawowa' ? 'matura-rozszerzona' : 'matura-podstawowa'),
  )!,
)
</script>

<template>
  <div class="exam-heading">
    <h1 class="exam-heading__title" :style="{ '--marker-fill': `var(--exam-${exam.id})` }">
      <StationMarker :shape="exam.solid" class="exam-heading__marker" />
      {{ exam.name }}
    </h1>
    <RouterLink
      v-if="otherRoute"
      class="exam-heading__other"
      :to="{ name: otherRoute, params: { exam: other.id } }"
      :style="{ '--marker-fill': `var(--exam-${other.id})` }"
    >
      <StationMarker :shape="other.solid" class="exam-heading__small-marker" />
      {{ other.name }}
    </RouterLink>
  </div>
</template>

<style scoped>
.exam-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
}

.exam-heading__title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.25rem);
  font-weight: 750;
  font-variation-settings: 'wdth' 90;
  letter-spacing: -0.02em;
}

.exam-heading__marker {
  flex: none;
  font-size: 0.85em;
}

/* Jak chip „powiązane z” na liście tematów: pigułka z obrysem, czarny obrys po najechaniu. */
.exam-heading__other {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0 1rem 0 0.85rem;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.2s ease;
}

.exam-heading__other:hover {
  border-color: var(--ink);
}

.exam-heading__small-marker {
  font-size: 1rem;
}
</style>
