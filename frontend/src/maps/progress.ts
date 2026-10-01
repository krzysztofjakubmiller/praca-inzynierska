import type { Difficulty, TopicProgress } from './types'

export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  0: 'łatwy',
  1: 'średni',
  2: 'trudny',
  3: 'bardzo trudny',
}

/** Część dobrze rozwiązanych spośród ostatnich wariantów, od 0 do 1; bez wyniku przed pierwszym. */
export function effectiveness(topic: TopicProgress | undefined): number | undefined {
  if (!topic || topic.recent.attempts <= 0) return undefined
  return topic.recent.correct / topic.recent.attempts
}

export type TopicState = 'untouched' | 'learning' | 'mastered' | 'weak'

export const TOPIC_STATE_NAMES: Record<TopicState, string> = {
  untouched: 'nieruszony',
  learning: 'w nauce',
  mastered: 'opanowany',
  weak: 'słaby',
}

// Skuteczność widać od pierwszego wariantu, ale temat oceniamy dopiero po tylu, żeby jedna
// pomyłka na starcie nie robiła z niego słabego.
export const MIN_ATTEMPTS = 5

/**
 * Stan tematu: słaby przy mniej niż połowie dobrych odpowiedzi, opanowany, gdy zrobione są
 * wszystkie zadania, a skuteczność wynosi co najmniej 80%.
 */
export function topicState(topic: TopicProgress | undefined): TopicState {
  if (!topic || topic.done <= 0) return 'untouched'
  const score = effectiveness(topic)
  if (score === undefined || topic.recent.attempts < MIN_ATTEMPTS) return 'learning'
  if (score < 0.5) return 'weak'
  if (topic.done >= topic.total && score >= 0.8) return 'mastered'
  return 'learning'
}

/** Jaka część zadań tematu jest zrobiona, od 0 do 1; tyle konturu stacji zmienia kolor. */
export function progressShare(topic: TopicProgress | undefined): number {
  if (!topic || topic.total <= 0) return 0
  return Math.min(1, Math.max(0, topic.done / topic.total))
}

export const MAX_PASSENGERS = 4

/**
 * Liczba pasażerów przy stacji: jeden na każde rozpoczęte 25% zrobionych zadań, które czekają
 * na powtórkę. Zaokrąglenie w górę, żeby nawet jedno zadanie do powtórki było widać. Przy
 * najwyżej czterech zrobionych zadaniach pasażer to po prostu jedno czekające zadanie, bo
 * inaczej jedno zrobione i czekające zadanie dawałoby od razu komplet pasażerów.
 */
export function passengerCount(topic: TopicProgress | undefined): number {
  if (!topic || topic.done <= 0 || topic.due <= 0) return 0
  const due = Math.min(topic.due, topic.done)
  if (topic.done <= MAX_PASSENGERS) return due
  return Math.ceil((MAX_PASSENGERS * due) / topic.done)
}
