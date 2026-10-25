<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import DemoSign from '@/components/DemoSign.vue'
import PracticeTask from '@/components/task/PracticeTask.vue'
import { PRODUCT_NAME } from '@/config/product'
import { loadDemoTask, Rejected, type PracticeTask as Task } from '@/practice'
import { setTheme, theme } from '@/theme'

const task = ref<Task | null>(null)
const checked = ref(false)
const problem = ref('')

onMounted(async () => {
  try {
    task.value = await loadDemoTask()
  } catch (error) {
    problem.value =
      error instanceof Rejected
        ? error.problems.join(' ')
        : 'Serwer nie odpowiada. Spróbuj za chwilę.'
  }
})
</script>

<template>
  <div class="demo-task">
    <header class="demo-task__top">
      <RouterLink class="demo-task__home" :to="{ name: 'landing' }">{{ PRODUCT_NAME }}</RouterLink>
      <button
        type="button"
        class="icon-button demo-task__theme"
        aria-label="Ciemny motyw"
        :aria-pressed="theme === 'dark'"
        @click="setTheme(theme === 'dark' ? 'light' : 'dark')"
      >
        <AppIcon name="theme" />
      </button>
    </header>
    <main class="demo-task__main">
      <DemoSign label="Przykładowe zadanie" />
      <p class="demo-task__lead">
        Zadanie z matury, takie jak w aplikacji. Rozwiąż je w zeszycie i zaznacz odpowiedź.
      </p>
      <p v-if="problem" class="demo-task__problem" role="alert">{{ problem }}</p>
      <PracticeTask v-if="task" :task="task" mode="cwiczenie" demo @checked="checked = true" />
      <section v-if="checked" class="demo-task__close" aria-labelledby="demo-task-close">
        <h2 id="demo-task-close">Na koncie to zadanie wraca w powtórkach</h2>
        <p>
          Po każdym zadaniu oceniasz, jak było trudne, a aplikacja sama ustala, kiedy do niego
          wrócić przed maturą.
        </p>
        <RouterLink class="button" :to="{ name: 'register' }">Załóż konto</RouterLink>
      </section>
    </main>
  </div>
</template>

<style scoped>
.demo-task__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-h);
  padding-inline: var(--gutter);
  border-bottom: 1px solid var(--hairline);
}

.demo-task__home {
  font-weight: 800;
  font-variation-settings: 'wdth' 112;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.demo-task__theme {
  margin-right: -0.625rem;
}

.demo-task__main {
  display: grid;
  gap: 1.25rem;
  max-width: 44rem;
  margin-inline: auto;
  padding: 1.5rem var(--gutter) 3rem;
}

.demo-task__lead {
  max-width: 44ch;
}

.demo-task__problem {
  color: var(--danger);
  font-weight: 600;
}

.demo-task__close {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--hairline);
}

.demo-task__close h2 {
  font-size: 1.375rem;
  font-weight: 750;
  font-stretch: 90%;
}

.demo-task__close p {
  max-width: 44ch;
}
</style>
