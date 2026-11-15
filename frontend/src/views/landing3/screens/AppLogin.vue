<script setup lang="ts">
import { useRouter } from 'vue-router'
import FlapText from '@/components/landing3/FlapText.vue'
import SolidFigure from '@/components/landing2/SolidFigure.vue'
import type { Look } from '../AppScreen.vue'

const props = defineProps<{ look: Look }>()
const router = useRouter()

// Podgląd: zamiast logowania formularz prowadzi do ekranu mapy.
function enter() {
  router.push(`/wizytowka3/${props.look}/mapa`)
}
</script>

<template>
  <main class="login">
    <div v-if="look === 'b'" class="as-board login__board" aria-hidden="true">
      <FlapText class="as-flaps" text="Wejście" :cells="12" settled />
      <FlapText class="as-flaps as-flaps--amber" text="Peron ucznia" :cells="12" settled />
    </div>
    <div v-else class="login__solid" aria-hidden="true">
      <SolidFigure kind="tetrahedron" :spin="0.12" :fill="0.9" :weight="0.035" />
    </div>

    <h1 class="as-title login__title">Zaloguj się</h1>

    <form class="login__form" @submit.prevent="enter">
      <label class="login__field">
        <span class="as-label">Adres e-mail</span>
        <input type="email" autocomplete="username" placeholder="ty@przyklad.pl" />
      </label>
      <label class="login__field">
        <span class="as-label">Hasło</span>
        <input type="password" autocomplete="current-password" />
      </label>
      <button class="button as-cta login__enter" type="submit">Wejdź</button>
      <button class="button button--quiet login__enter" type="button" @click="enter">
        Zaloguj przez Google
      </button>
    </form>

    <p class="login__links">
      <a href="#">Nie pamiętam hasła</a>
      <a href="#">Załóż konto</a>
    </p>
  </main>
</template>

<style scoped>
.login {
  display: grid;
  gap: 1.5rem;
  align-content: center;
  flex: 1;
  width: min(100%, 26rem);
  margin-inline: auto;
  padding: 2rem var(--gutter) 3rem;
}

/* Rozmiar pola klapki liczy się z szerokości tablicy. */
.login__board {
  --cell: calc((100cqi - 1.6rem) / 12);
  container-type: inline-size;
}

.login__solid {
  width: 9rem;
  height: 9rem;
  margin-left: -0.75rem;
  color: #4fd58d;
}

.login__title {
  font-size: clamp(2.6rem, 2rem + 4vw, 3.75rem);
}

.login__form {
  display: grid;
  gap: 1rem;
}

.login__field {
  display: grid;
  gap: 0.4rem;
}

.login__field input {
  width: 100%;
  min-height: 3.25rem;
  padding: 0 1rem;
  border: 2px solid var(--ink);
  border-radius: 0.8rem;
  background: var(--surface);
  color: var(--ink);
  caret-color: var(--accent);
  font: inherit;
}

.login__field input::placeholder {
  color: var(--ink-soft);
}

.login__enter {
  width: 100%;
}

.login__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1.5rem;
}

.login__links a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  font-weight: 600;
}
</style>
