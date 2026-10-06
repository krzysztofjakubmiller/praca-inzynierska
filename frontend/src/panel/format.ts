import { ref } from 'vue'
import { Rejected, type AnswerFormat, type ReviewStatus } from './api'

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  'do-sprawdzenia': 'do sprawdzenia',
  sprawdzone: 'sprawdzone',
}

export const ANSWER_FORMATS: Record<AnswerFormat, string> = {
  'wielokrotny-wybor': 'wielokrotny wybór',
  'prawda-falsz': 'prawda/fałsz',
  dobieranie: 'dobieranie',
  otwarte: 'otwarte',
}

export function taskNumber(task: { number: number; subnumber: number | null }): string {
  return task.subnumber ? `${task.number}.${task.subnumber}` : String(task.number)
}

// Wykonuje akcję panelu i zamienia odrzucenie przez backend na listę problemów do pokazania.
export function useProblems() {
  const problems = ref<string[]>([])

  async function run(action: () => Promise<void>) {
    problems.value = []
    try {
      await action()
    } catch (error) {
      if (!(error instanceof Rejected)) throw error
      problems.value = error.problems
    }
  }

  return { problems, run }
}
