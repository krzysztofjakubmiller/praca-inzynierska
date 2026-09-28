<script setup lang="ts">
import { PRODUCT_NAME } from '@/config/product'
</script>

<template>
  <main>
    <h1>{{ PRODUCT_NAME }}</h1>
    <RouterLink :to="{ name: 'basic-matura' }">Matura podstawowa</RouterLink>
  </main>
</template>
