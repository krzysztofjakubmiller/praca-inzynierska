import { createRouter, createWebHistory } from 'vue-router'
import { savedPassword } from '@/access'
import type { Exam } from '@/config/exams'
import { PRODUCT_NAME } from '@/config/product'
import { blockedClicks } from '@/landing2/survey'
import { BASIC_MAP, EXTENDED_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS, BASIC_DEMO_SHEETS } from '@/maps/basic/demoProgress'
import { EXTENDED_DEMO_PROGRESS, EXTENDED_DEMO_SHEETS } from '@/maps/extended/demoProgress'
import LandingView from '@/views/LandingView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    panel?: boolean
    exam?: Exam['id']
    public?: boolean
    /** Strona z ankiety wizytówek, oglądana bez hasła dostępu. */
    survey?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/StartView.vue'),
      meta: { title: 'Strony' },
    },
    {
      path: '/haslo',
      name: 'access',
      component: () => import('@/views/AccessView.vue'),
      props: { kind: 'access' },
      meta: { title: 'Wejście' },
    },
    {
      path: '/panel/haslo',
      name: 'panel-access',
      component: () => import('@/views/AccessView.vue'),
      props: { kind: 'panel' },
      meta: { title: 'Panel' },
    },
    {
      path: '/logowanie',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      props: { mode: 'login' },
      meta: { title: 'Logowanie' },
    },
    {
      path: '/rejestracja',
      name: 'register',
      component: () => import('@/views/LoginView.vue'),
      props: { mode: 'register' },
      meta: { title: 'Rejestracja' },
    },
    {
      path: '/konto',
      component: () => import('@/views/AccountView.vue'),
      children: [
        {
          path: '',
          name: 'account',
          component: () => import('@/views/account/ProfileTab.vue'),
          meta: { title: 'Profil' },
        },
        {
          path: 'postep/:exam(matura-podstawowa|matura-rozszerzona)',
          name: 'account-progress',
          component: () => import('@/views/account/ProgressTab.vue'),
          props: true,
          meta: { title: 'Postęp' },
        },
        {
          path: 'ustawienia',
          name: 'account-settings',
          component: () => import('@/views/account/SettingsTab.vue'),
          meta: { title: 'Ustawienia' },
        },
      ],
    },
    {
      path: '/demo/postep/:exam(matura-podstawowa|matura-rozszerzona)',
      name: 'demo-progress',
      component: () => import('@/views/DemoProgressView.vue'),
      props: true,
      meta: { title: 'Przykładowy postęp' },
    },
    {
      path: '/demo/zadanie',
      name: 'demo-task',
      component: () => import('@/views/DemoTaskView.vue'),
      meta: { title: 'Przykładowe zadanie' },
    },
    {
      path: '/potwierdz-adres',
      name: 'confirm-email',
      component: () => import('@/views/ConfirmEmailView.vue'),
      meta: { title: 'Potwierdzenie adresu' },
    },
    {
      path: '/nie-pamietam-hasla',
      name: 'password-link',
      component: () => import('@/views/PasswordLinkView.vue'),
      meta: { title: 'Ustaw hasło' },
    },
    {
      path: '/nowe-haslo',
      name: 'new-password',
      component: () => import('@/views/NewPasswordView.vue'),
      meta: { title: 'Nowe hasło' },
    },
    {
      path: '/regulamin',
      name: 'terms',
      component: () => import('@/views/TermsView.vue'),
      meta: { title: 'Regulamin', public: true },
    },
    {
      path: '/polityka-prywatnosci',
      name: 'privacy',
      component: () => import('@/views/PrivacyView.vue'),
      meta: { title: 'Polityka prywatności', public: true },
    },
    {
      path: '/wizytowka',
      name: 'landing',
      component: LandingView,
    },
    {
      path: '/ankieta',
      name: 'survey',
      component: () => import('@/views/landing2/SurveyList.vue'),
      meta: { title: 'Ankieta', public: true },
    },
    {
      path: '/wizytowka/:page(a|b|c|d|e|f|g)',
      name: 'survey-page',
      component: () => import('@/views/landing2/SurveyPage.vue'),
      props: true,
      meta: { public: true, survey: true },
    },
    {
      path: '/panel',
      name: 'panel',
      component: () => import('@/views/PanelView.vue'),
      meta: { title: 'Panel', panel: true },
    },
    {
      path: '/panel/zadanie/:id',
      name: 'panel-task',
      component: () => import('@/views/PanelTaskView.vue'),
      meta: { title: 'Zadanie', panel: true },
    },
    {
      path: '/panel/warianty',
      name: 'panel-templates',
      component: () => import('@/views/PanelTemplatesView.vue'),
      meta: { title: 'Warianty', panel: true },
    },
    {
      path: '/panel/warianty/:id',
      name: 'panel-template',
      component: () => import('@/views/PanelTemplateView.vue'),
      meta: { title: 'Szablon wariantów', panel: true },
    },
    {
      path: '/panel/oceny-ai',
      name: 'panel-ai-grades',
      component: () => import('@/views/PanelAiGradesView.vue'),
      meta: { title: 'Oceny AI', panel: true },
    },
    {
      path: '/panel/oceny-trudnosci',
      name: 'panel-ratings',
      component: () => import('@/views/PanelRatingsView.vue'),
      meta: { title: 'Oceny trudności', panel: true },
    },
    {
      path: '/panel/ankieta',
      name: 'panel-survey',
      component: () => import('@/views/PanelSurveyView.vue'),
      meta: { title: 'Ankieta', panel: true },
    },
    {
      path: '/wkrotce',
      name: 'coming-soon',
      component: () => import('@/views/ComingSoonView.vue'),
      meta: { title: 'Wkrótce' },
    },
    {
      path: '/matura-podstawowa',
      name: 'basic-matura',
      component: () => import('@/views/ExamView.vue'),
      props: { map: BASIC_MAP, progress: BASIC_DEMO_PROGRESS, sheets: BASIC_DEMO_SHEETS },
      meta: { title: 'Matura podstawowa', exam: 'matura-podstawowa' },
    },
    {
      path: '/matura-rozszerzona',
      name: 'extended-matura',
      component: () => import('@/views/ExamView.vue'),
      props: { map: EXTENDED_MAP, progress: EXTENDED_DEMO_PROGRESS, sheets: EXTENDED_DEMO_SHEETS },
      meta: { title: 'Matura rozszerzona', exam: 'matura-rozszerzona' },
    },
    {
      path: '/:exam(matura-podstawowa|matura-rozszerzona)/cwicz/:topic',
      name: 'practice-topic',
      component: () => import('@/views/PracticeView.vue'),
      props: (route) => ({ ...route.params, mode: 'cwiczenie' }),
      meta: { title: 'Ćwiczenie' },
    },
    {
      path: '/:exam(matura-podstawowa|matura-rozszerzona)/powtorki',
      name: 'reviews',
      component: () => import('@/views/PracticeView.vue'),
      props: (route) => ({ ...route.params, mode: 'powtorka' }),
      meta: { title: 'Powtórki' },
    },
    {
      path: '/:exam(matura-podstawowa|matura-rozszerzona)/losowe',
      name: 'random-task',
      component: () => import('@/views/PracticeView.vue'),
      props: (route) => ({ ...route.params, mode: 'losowe' }),
      meta: { title: 'Losowe zadanie' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Nie ma takiej strony' },
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      // scrollIntoView uwzględnia scroll-margin, więc sekcja nie chowa się pod nagłówkiem.
      document.getElementById(decodeURIComponent(to.hash.slice(1)))?.scrollIntoView()
      return false
    }
    return { top: 0 }
  },
})

// Do czasu logowania każda strona jest za hasłem, a panel za drugim. Tu sprawdzamy tylko, czy
// jakieś zapamiętano; czy jest dobre, rozstrzyga backend przy wejściu i przy zapytaniach panelu.
// Regulamin i polityka prywatności są publiczne, bo czyta się je przed założeniem konta.
router.beforeEach((to, from) => {
  if (!to.meta.public && to.name !== 'access' && !savedPassword('access')) {
    // Oceniający wizytówki nie ma hasła, więc przycisk do aplikacji zostawia go na stronie,
    // a dymek ankiety wyjaśnia dlaczego.
    if (from.meta.survey) {
      blockedClicks.value++
      return false
    }
    return { name: 'access', query: { dalej: to.fullPath } }
  }
  if (to.meta.panel && !savedPassword('panel')) {
    return { name: 'panel-access', query: { dalej: to.fullPath } }
  }
})

router.afterEach((to, _from, failure) => {
  // Zatrzymane przejście zostawia użytkownika na starej stronie, więc tytuł też zostaje.
  if (failure) return
  document.title = to.meta.title ? `${to.meta.title} · ${PRODUCT_NAME}` : PRODUCT_NAME
  // Na stronie egzaminu ikona karty to kształt jego stacji z mapy, wszędzie indziej litera M.
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (icon) icon.href = to.meta.exam ? `/favicon-${to.meta.exam}.svg` : '/favicon.svg'
})

export default router
