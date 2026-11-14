<script setup lang="ts">
import { PRODUCT_NAME } from '@/config/product'
import { usePageGround } from '@/landing2/pageGround'
import FlapText from '@/components/landing2/FlapText.vue'
import './board.css'

// Podgląd wyglądu: formularz niczego nie wysyła.
usePageGround('#131210')
</script>

<template>
  <div class="bt">
    <header class="bt-top">
      <RouterLink class="bt-top__mark" :to="{ name: 'styles' }">{{ PRODUCT_NAME }}</RouterLink>
      <RouterLink class="bt-top__link" :to="{ name: 'styles' }">Wróć do listy</RouterLink>
    </header>

    <main class="login">
      <div class="bt-board login__board" aria-hidden="true">
        <FlapText text="Wejście" :cells="12" />
        <FlapText class="bt-board--amber" text="Peron ucznia" :cells="12" :delay="250" />
      </div>

      <h1 class="bt-title login__title">Zaloguj się</h1>

      <form class="login__form" @submit.prevent>
        <label class="login__field">
          <span class="bt-label">Adres e-mail</span>
          <input type="email" autocomplete="username" placeholder="ty@przyklad.pl" />
        </label>
        <label class="login__field">
          <span class="bt-label">Hasło</span>
          <input type="password" autocomplete="current-password" />
        </label>
        <button class="button bt-cta login__enter" type="submit">Wejdź</button>
        <button class="button button--quiet login__enter" type="button">
          Zaloguj przez Google
        </button>
      </form>

      <p class="login__links">
        <a href="#">Nie pamiętam hasła</a>
        <a href="#">Załóż konto</a>
      </p>
    </main>
  </div>
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
  min-height: 3.1rem;
  padding: 0 0.95rem;
  border: 1.5px solid var(--hairline);
  border-radius: 0.7rem;
  background: var(--surface);
  color: var(--ink);
  caret-color: var(--amber);
  font: inherit;
  font-size: 1.0625rem;
  transition: border-color 0.2s ease;
}

.login__field input::placeholder {
  color: #8e8a80;
}

.login__field input:focus-visible {
  border-color: var(--amber);
  outline: none;
}

.login__enter {
  width: 100%;
}

.login__enter:first-of-type {
  margin-top: 0.5rem;
}

.login__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 1.5rem;
  color: var(--ink-soft);
  font-size: 0.9375rem;
}

.login__links a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
}

.login__links a:hover {
  color: var(--ink);
}
</style>
