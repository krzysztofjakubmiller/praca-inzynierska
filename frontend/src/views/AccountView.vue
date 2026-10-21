<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadAccount, type Account } from '@/account'
import AppIcon from '@/components/AppIcon.vue'
import StationMarker from '@/components/landing/StationMarker.vue'
import { EXAMS } from '@/config/exams'
import { profile, refreshProfile } from '@/profile'
import { setTheme, theme } from '@/theme'

const router = useRouter()
const route = useRoute()

const account = ref<Account | null>(null)
const problem = ref('')

// Uczeń rozszerzenia uczy się obu poziomów, ale jego mapą i postępem jest rozszerzenie.
const exam = computed(() =>
  EXAMS.find(
    (item) =>
      item.id ===
      (profile.value?.level === 'rozszerzona' ? 'matura-rozszerzona' : 'matura-podstawowa'),
  )!,
)
const examPage = computed(() =>
  exam.value.id === 'matura-rozszerzona' ? 'extended-matura' : 'basic-matura',
)

// Kolejne zakładki (np. prace domowe) dochodzą tutaj; pasek na telefonie przewija się w bok.
const tabs = computed(() => [
  { label: 'Profil', to: { name: 'account' }, names: ['account'] },
  {
    label: 'Postęp',
    to: { name: 'account-progress', params: { exam: exam.value.id } },
    names: ['account-progress'],
  },
  { label: 'Ustawienia', to: { name: 'account-settings' }, names: ['account-settings'] },
])

onMounted(async () => {
  try {
    account.value = await loadAccount()
  } catch {
    problem.value = 'Serwer nie odpowiada. Spróbuj za chwilę.'
    return
  }
  if (!account.value) {
    await router.replace({ name: 'login' })
    return
  }
  try {
    await refreshProfile()
  } catch {
    problem.value = 'Nie udało się wczytać ustawień. Spróbuj za chwilę.'
  }
})
</script>

<template>
  <div class="account">
    <header class="account__top">
      <RouterLink
        class="account__back"
        :to="{ name: examPage }"
        :style="{ '--marker-fill': `var(--exam-${exam.id})` }"
      >
        <AppIcon name="chevron-left" class="account__chevron" />
        <StationMarker :shape="exam.solid" class="account__marker" />
        <span class="account__exam">{{ exam.name }}</span>
      </RouterLink>
      <button
        type="button"
        class="icon-button account__theme"
        aria-label="Ciemny motyw"
        :aria-pressed="theme === 'dark'"
        @click="setTheme(theme === 'dark' ? 'light' : 'dark')"
      >
        <AppIcon name="theme" />
      </button>
    </header>

    <aside class="account__side">
      <p v-if="account" class="account__email">{{ account.email }}</p>
      <nav class="account__tabs" aria-label="Konto">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.label"
          class="account__tab"
          :to="tab.to"
          :aria-current="tab.names.includes(String(route.name)) ? 'page' : undefined"
        >
          {{ tab.label }}
        </RouterLink>
      </nav>
    </aside>

    <main class="account__main">
      <p v-if="problem" class="account__problem" role="alert">{{ problem }}</p>
      <RouterView v-if="account" :account="account" />
    </main>
  </div>
</template>

<style scoped>
.account {
  display: grid;
  grid-template-rows: auto auto 1fr;
  min-height: 100svh;
}

.account__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  height: var(--header-h);
  padding-inline: var(--gutter);
}

.account__back {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  min-height: 2.75rem;
  margin-left: -0.5rem;
  padding: 0 0.875rem 0 0.25rem;
  border-radius: 999px;
  font-size: 1.0625rem;
  font-weight: 700;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.account__back:hover {
  background: var(--hairline);
}

.account__chevron {
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
}

.account__marker {
  flex: none;
  font-size: 1.1rem;
}

.account__exam {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account__theme {
  margin-right: -0.625rem;
}

.account__side {
  padding: 0.25rem var(--gutter) 0.75rem;
  border-bottom: 1px solid var(--hairline);
}

.account__email {
  display: none;
}

/* Zakładki jak przełącznik „Mapa | Lista” na stronie egzaminu, od razu na 44 px wysokości,
   bo przewijany pasek ucina pole dotyku wystające poza pigułkę. */
.account__tabs {
  display: flex;
  width: fit-content;
  max-width: 100%;
  height: 2.75rem;
  padding: 0.125rem;
  overflow-x: auto;
  border: 1.5px solid var(--hairline);
  border-radius: 999px;
  scrollbar-width: none;
}

.account__tab {
  display: inline-flex;
  flex: none;
  align-items: center;
  padding: 0 1rem;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.account__tab:hover {
  background: var(--hairline);
}

.account__tab[aria-current='page'] {
  background: var(--ink);
  color: var(--ground);
}

.account__tab:focus-visible {
  outline-offset: -3px;
}

.account__main {
  width: 100%;
  max-width: 64rem;
  padding: 1.25rem var(--gutter) 4rem;
}

.account__problem {
  margin-bottom: 1rem;
  color: var(--danger);
  font-weight: 600;
}

/* Na komputerze zakładki stoją w pionie w lewej kolumnie, jak menu na stronie egzaminu. */
@media (min-width: 64rem) {
  .account {
    grid-template-columns: 22rem minmax(0, 1fr);
    grid-template-rows: auto 1fr;
  }

  .account__top {
    grid-column: 1 / -1;
    border-bottom: 1px solid var(--hairline);
  }

  .account__side {
    padding: var(--sheet-pad) calc(var(--sheet-pad) - 0.75rem);
    border-right: 1px solid var(--hairline);
    border-bottom: 0;
    background: var(--surface);
  }

  .account__email {
    display: block;
    overflow: hidden;
    margin: 0 0.75rem 1rem;
    color: var(--ink-soft);
    font-size: 0.875rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account__tabs {
    flex-direction: column;
    width: auto;
    height: auto;
    padding: 0;
    border: 0;
    border-radius: 0;
  }

  .account__tab {
    min-height: 2.75rem;
    padding: 0 0.75rem;
    font-size: 1.0625rem;
    font-weight: 550;
  }

  .account__tab[aria-current='page'] {
    background: var(--hairline);
    color: var(--ink);
    font-weight: 700;
  }

  .account__main {
    padding: 2rem clamp(2rem, 4vw, 3.5rem) 5rem;
  }
}
</style>
