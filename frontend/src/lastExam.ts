import { computed, ref } from 'vue'
import { EXAMS, type Exam } from '@/config/exams'
import { profileExamId } from '@/profile'

// Egzamin, którego mapę uczeń ostatnio otworzył. Pamięta go przeglądarka, żeby konto po
// odświeżeniu strony nie wracało do innego egzaminu.
const KEY = 'ostatni-egzamin'

function saved(): Exam['id'] | null {
  const id = localStorage.getItem(KEY)
  return EXAMS.find((exam) => exam.id === id)?.id ?? null
}

export const lastExam = ref(saved())

export function rememberExam(id: Exam['id']) {
  lastExam.value = id
  localStorage.setItem(KEY, id)
}

/**
 * Egzamin, w którego kolorach jest konto i do którego wraca jego strzałka. Kto nie otworzył
 * jeszcze żadnej mapy, dostaje egzamin ze swojego poziomu.
 */
export const accountExamId = computed(() => lastExam.value ?? profileExamId.value)
