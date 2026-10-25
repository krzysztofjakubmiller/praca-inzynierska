<script setup lang="ts">
import MathText from '@/components/task/MathText.vue'
import '@/assets/task.css'

// Bez picked tabela tylko pokazuje zdania (podgląd w panelu). Z picked uczeń zaznacza P albo F;
// picked[i] to wybór przy i-tym zdaniu albo spacja. answer to klucz, znany dopiero po sprawdzeniu.
const props = defineProps<{
  choices: { label: string; text: string }[]
  picked?: string
  answer?: string
}>()

const emit = defineEmits<{ pick: [index: number, mark: 'P' | 'F'] }>()

function markClass(index: number, mark: 'P' | 'F') {
  if (props.answer === undefined) return {}
  return {
    'answer-mark--key': props.answer[index] === mark,
    'answer-mark--wrong': props.answer[index] !== mark,
  }
}
</script>

<template>
  <table class="true-false">
    <tbody>
      <tr v-for="(choice, index) in choices" :key="choice.label">
        <td><MathText :text="choice.text" /></td>
        <template v-if="picked === undefined">
          <td class="true-false__mark">P</td>
          <td class="true-false__mark">F</td>
        </template>
        <td v-for="mark in ['P', 'F'] as const" v-else :key="mark" class="true-false__choice">
          <button
            type="button"
            class="answer-mark"
            :class="markClass(index, mark)"
            :aria-pressed="picked[index] === mark"
            :aria-label="`Zdanie ${index + 1}: ${mark === 'P' ? 'prawda' : 'fałsz'}`"
            :disabled="answer !== undefined"
            @click="emit('pick', index, mark)"
          >
            {{ mark }}
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.true-false {
  width: 100%;
  border-collapse: collapse;
}

.true-false td {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--ink);
}

.true-false__mark {
  width: 2.75rem;
  font-weight: 700;
  text-align: center;
}

.true-false td.true-false__choice {
  width: 2.75rem;
  height: 1px;
  padding: 0;
}
</style>
