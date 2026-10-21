<script setup lang="ts">
import { computed, onMounted, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { refreshProfile } from '@/profile'
import { darkShade, theme } from '@/theme'

const route = useRoute()

// Wizytówka jest zaprojektowana na jasne tło, a panel właściciela porównuje odczyt ze zdjęciem
// strony arkusza, więc obie zostają jasne niezależnie od wyboru. Tę samą regułę ma skrypt
// w index.html.
const lightOnly = computed(() => /^\/(wizytowka|panel)(\/|$)/.test(route.path))

watchEffect(() => {
  const root = document.documentElement
  if (lightOnly.value || theme.value === 'light') {
    delete root.dataset.theme
    delete root.dataset.shade
  } else {
    root.dataset.theme = 'dark'
    root.dataset.shade = darkShade.value
  }
  // Pasek przeglądarki na telefonie ma kolor tła strony.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', getComputedStyle(root).getPropertyValue('--ground').trim())
})

onMounted(() => {
  refreshProfile().catch(() => {
    // Bez serwera zostaje motyw zapamiętany w przeglądarce.
  })
})
</script>

<template>
  <RouterView />
</template>
