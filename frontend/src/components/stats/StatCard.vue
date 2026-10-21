<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import '@/assets/stats.css'

withDefaults(defineProps<{ title: string; note?: string; level?: 2 | 3 }>(), { level: 2 })

// Wykres dostaje szerokość karty w pikselach i rysuje się w niej jeden do jednego, więc napisy
// mają ten sam rozmiar na telefonie i na komputerze.
const body = useTemplateRef('body')
const width = ref(320)
let observer: ResizeObserver | undefined

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry && entry.contentRect.width > 0) width.value = Math.floor(entry.contentRect.width)
  })
  observer.observe(body.value!)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section class="stat-card">
    <component :is="`h${level}`" class="stat-card__title">{{ title }}</component>
    <p v-if="note" class="stat-card__note">{{ note }}</p>
    <div ref="body" class="stat-card__body">
      <slot :width="width" />
    </div>
  </section>
</template>

<style scoped>
.stat-card {
  min-width: 0;
  padding: 1rem 1rem 1.125rem;
  border: 1px solid var(--hairline);
  border-radius: 1rem;
  background: var(--surface);
}

.stat-card__title {
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.25;
}

.stat-card__note {
  max-width: 44ch;
  margin-top: 0.25rem;
  color: var(--ink-soft);
  font-size: 0.875rem;
  line-height: 1.4;
}

.stat-card__body {
  margin-top: 1rem;
}
</style>
