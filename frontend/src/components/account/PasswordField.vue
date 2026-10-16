<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ id: string; label: string; autocomplete: string }>()

const password = defineModel<string>({ required: true })
const visible = ref(false)
</script>

<template>
  <div class="password-field">
    <label :for="id">{{ label }}</label>
    <div class="password-field__row">
      <input
        :id="id"
        v-model="password"
        :type="visible ? 'text' : 'password'"
        :autocomplete="autocomplete"
        required
      />
      <button
        class="button button--quiet password-field__toggle"
        type="button"
        :aria-label="visible ? 'Ukryj hasło' : 'Pokaż hasło'"
        @click="visible = !visible"
      >
        {{ visible ? 'Ukryj' : 'Pokaż' }}
      </button>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.password-field {
  display: grid;
  gap: 0.35rem;
  width: 100%;
  font-weight: 600;
}

.password-field__row {
  display: flex;
  gap: 0.5rem;
}

.password-field__row input {
  flex: 1;
  min-width: 0;
}
</style>
