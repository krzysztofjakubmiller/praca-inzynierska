<script setup lang="ts">
import { PRODUCT_NAME } from '@/config/product'
import { usePageGround } from '@/landing2/pageGround'
import '@/assets/auth.css'
import '@/views/landing3/screens/screens.css'

// Strony z drogi do konta (hasło dostępu, ustawianie hasła, potwierdzenie adresu) w tej samej
// granatowej oprawie co logowanie.
usePageGround('#16224f')
</script>

<template>
  <div class="as as--a">
    <header class="as-top">
      <RouterLink class="as-top__mark" :to="{ name: 'home' }">{{ PRODUCT_NAME }}</RouterLink>
    </header>
    <main class="auth">
      <slot />
    </main>
  </div>
</template>
