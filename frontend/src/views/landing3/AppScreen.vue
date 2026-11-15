<script setup lang="ts">
import { onBeforeUnmount, watchEffect } from 'vue'
import { PRODUCT_NAME } from '@/config/product'
import AppLogin from './screens/AppLogin.vue'
import AppMap from './screens/AppMap.vue'
import AppTask from './screens/AppTask.vue'
import './screens/screens.css'

// Podgląd ekranów aplikacji w stylu wizytówki A albo B. Formularze niczego nie wysyłają,
// a przyciski prowadzą tylko między tymi trzema ekranami.
export type Look = 'a' | 'b'
type Screen = 'logowanie' | 'mapa' | 'zadanie'

const props = defineProps<{ look: Look; screen: Screen }>()

const SCREENS: { id: Screen; name: string }[] = [
  { id: 'logowanie', name: 'Logowanie' },
  { id: 'mapa', name: 'Mapa' },
  { id: 'zadanie', name: 'Zadanie' },
]

// Kolor pod stroną, widoczny przy przeciągnięciu jej poza krawędź na telefonie.
watchEffect(() => {
  const light = props.look === 'b' ? '#f3efe6' : '#e6e9f2'
  document.body.style.background =
    props.look === 'a' && props.screen !== 'zadanie' ? '#16224f' : light
})
onBeforeUnmount(() => (document.body.style.background = ''))
</script>

<template>
  <div class="as" :class="[`as--${look}`, `as--${screen}`]">
    <header class="as-top">
      <RouterLink class="as-top__mark" :to="`/wizytowka3/${look}`">{{ PRODUCT_NAME }}</RouterLink>
      <nav class="as-top__screens" aria-label="Ekrany aplikacji">
        <RouterLink
          v-for="item in SCREENS"
          :key="item.id"
          class="as-top__screen"
          :to="`/wizytowka3/${look}/${item.id}`"
          :aria-current="item.id === screen ? 'page' : undefined"
        >
          {{ item.name }}
        </RouterLink>
      </nav>
    </header>
    <AppLogin v-if="screen === 'logowanie'" :look="look" />
    <AppMap v-else-if="screen === 'mapa'" :look="look" />
    <AppTask v-else :look="look" />
  </div>
</template>
