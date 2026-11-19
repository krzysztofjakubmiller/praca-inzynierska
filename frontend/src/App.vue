<script setup lang="ts">
import { computed, onMounted, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { refreshProfile } from '@/profile'
import { darkShade, theme } from '@/theme'

const route = useRoute()

// Motyw z ustawień konta dotyczy tylko aplikacji. Wizytówki z ankietą, logowanie z ustawianiem
// hasła i płatność mają własne, stałe kolory, a panel właściciela porównuje odczyt ze zdjęciem
// strony arkusza, więc zostaje jasny. Tę samą regułę ma skrypt w index.html.
const FIXED_LOOK =
  /^\/(wizytowka3?|ankieta|style|panel|logowanie|rejestracja|platnosc|potwierdz-adres|nie-pamietam-hasla|nowe-haslo)(\/|$)/
const fixedLook = computed(() => FIXED_LOOK.test(route.path))

watchEffect(() => {
  const root = document.documentElement
  if (fixedLook.value) {
    delete root.dataset.theme
    delete root.dataset.shade
  } else if (theme.value === 'light') {
    root.dataset.theme = 'light'
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
