<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MathText from '@/components/task/MathText.vue'
import { aiGradeImage, panelApi, Rejected, type AiGrade } from '@/panel/api'

// Oceny AI z aplikacji obok pola na punkty korepetytora: z tego wychodzi zgodność AI
// z oceną człowieka w pracy.
const grades = ref<AiGrade[]>([])
const images = ref<Record<number, string>>({})
const problems = ref<string[]>([])

onMounted(async () => {
  try {
    grades.value = await panelApi.aiGrades()
  } catch (error) {
    problems.value = error instanceof Rejected ? error.problems : ['nie udało się wczytać ocen']
  }
})

async function showImage(id: number) {
  images.value[id] = await aiGradeImage(id)
}

async function savePoints(grade: AiGrade, value: string) {
  try {
    await panelApi.setTutorPoints(grade.id, Number(value))
    grade.tutor_points = Number(value)
  } catch (error) {
    problems.value = error instanceof Rejected ? error.problems : ['nie udało się zapisać']
  }
}
</script>

<template>
  <main class="ai-grades">
    <h1>Oceny AI</h1>
    <RouterLink :to="{ name: 'panel' }">Panel</RouterLink>
    <p v-for="problem in problems" :key="problem" role="alert">{{ problem }}</p>
    <p v-if="!grades.length">Brak ocen AI.</p>

    <article v-for="grade in grades" :key="grade.id" class="ai-grades__item">
      <p>
        #{{ grade.id }} · {{ new Date(grade.created_at).toLocaleString('pl-PL') }} · zadanie
        {{ grade.task_id }} · {{ grade.model }}
      </p>
      <MathText :text="grade.content" />
      <template v-if="grade.has_image">
        <img v-if="images[grade.id]" :src="images[grade.id]" alt="Rozwiązanie ucznia" />
        <button v-else type="button" @click="showImage(grade.id)">Pokaż zdjęcie</button>
      </template>
      <p v-else-if="grade.image_file">Zdjęcie na dysku: {{ grade.image_file }}</p>
      <p v-if="grade.text">Opis ucznia: <MathText :text="grade.text" /></p>
      <p>Odczyt AI: <MathText :text="grade.reading" /></p>
      <p>Wyjaśnienie AI: <MathText :text="grade.explanation" /></p>
      <p>
        Punkty AI: {{ grade.ai_points ?? 'nieczytelne' }} z {{ grade.max_points }}
        <template v-if="grade.feedback">
          · uczeń: {{ grade.feedback }}
          <template v-if="grade.feedback_comment">({{ grade.feedback_comment }})</template>
        </template>
      </p>
      <label>
        Moje punkty:
        <select
          :value="grade.tutor_points ?? ''"
          @change="savePoints(grade, ($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>wybierz</option>
          <option v-for="points in grade.max_points + 1" :key="points" :value="points - 1">
            {{ points - 1 }}
          </option>
        </select>
      </label>
    </article>
  </main>
</template>

<style scoped>
.ai-grades {
  display: grid;
  gap: 1rem;
  max-width: 50rem;
  padding: 1rem;
}

.ai-grades__item {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--hairline);
}

.ai-grades__item img {
  max-width: 100%;
}
</style>
