<script setup lang="ts">
import { computed, ref } from 'vue'
import { sendFeedback, type Feedback } from '@/practice'

// Reakcja ucznia na ocenę albo pomoc AI, do analizy w pracy. Komentarz jest opcjonalny
// i dochodzi po kliknięciu.
const props = defineProps<{ requestId: number; about: 'ocena' | 'pomoc' }>()

const options = computed<{ feedback: Feedback; name: string }[]>(() =>
  props.about === 'ocena'
    ? [
        { feedback: 'zgadzam-sie', name: 'Zgadzam się z oceną' },
        { feedback: 'nie-zgadzam-sie', name: 'Nie zgadzam się' },
      ]
    : [
        { feedback: 'pomoglo', name: 'Pomogło' },
        { feedback: 'nie-pomoglo', name: 'Nie pomogło' },
      ],
)
const chosen = ref<Feedback | null>(null)
const comment = ref('')
const commented = ref(false)

async function choose(feedback: Feedback) {
  chosen.value = feedback
  await sendFeedback(props.requestId, feedback).catch(() => null)
}

async function sendComment() {
  await sendFeedback(props.requestId, chosen.value!, comment.value).catch(() => null)
  commented.value = true
}
</script>

<template>
  <div class="ai-feedback">
    <button
      v-for="option in options"
      :key="option.feedback"
      type="button"
      class="button button--quiet"
      :aria-pressed="chosen === option.feedback"
      @click="choose(option.feedback)"
    >
      {{ option.name }}
    </button>
    <template v-if="chosen && !commented">
      <textarea v-model="comment" rows="2" placeholder="Komentarz (nieobowiązkowy)" />
      <button type="button" class="button button--quiet" :disabled="!comment.trim()" @click="sendComment">
        Wyślij komentarz
      </button>
    </template>
    <p v-if="commented">Dzięki za komentarz.</p>
  </div>
</template>

<style scoped>
.ai-feedback {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ai-feedback textarea {
  flex-basis: 100%;
}

.ai-feedback [aria-pressed='true'] {
  border-color: var(--ink);
}
</style>
