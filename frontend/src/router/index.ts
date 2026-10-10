import { createRouter, createWebHistory } from 'vue-router'
import { savedPassword } from '@/access'
import { PRODUCT_NAME } from '@/config/product'
import { BASIC_MAP, EXTENDED_MAP } from '@/maps'
import { BASIC_DEMO_PROGRESS, BASIC_DEMO_SHEETS } from '@/maps/basic/demoProgress'
import { EXTENDED_DEMO_PROGRESS, EXTENDED_DEMO_SHEETS } from '@/maps/extended/demoProgress'
import LandingView from '@/views/LandingView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
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
      meta: { title: 'Wejście' },
    },
    {
      path: '/wizytowka',
      name: 'landing',
      component: LandingView,
    },
    {
      path: '/panel',
      name: 'panel',
      component: () => import('@/views/PanelView.vue'),
      meta: { title: 'Panel' },
    },
    {
      path: '/panel/zadanie/:id',
      name: 'panel-task',
      component: () => import('@/views/PanelTaskView.vue'),
      meta: { title: 'Zadanie' },
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
      meta: { title: 'Matura podstawowa' },
    },
    {
      path: '/matura-rozszerzona',
      name: 'extended-matura',
      component: () => import('@/views/ExamView.vue'),
      props: { map: EXTENDED_MAP, progress: EXTENDED_DEMO_PROGRESS, sheets: EXTENDED_DEMO_SHEETS },
      meta: { title: 'Matura rozszerzona' },
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

// Do czasu logowania każda strona jest za hasłem. Tu sprawdzamy tylko, czy jakieś zapamiętano;
// czy jest dobre, rozstrzyga backend przy wejściu i przy każdym zapytaniu panelu.
router.beforeEach((to) => {
  if (to.name !== 'access' && !savedPassword()) {
    return { name: 'access', query: { dalej: to.fullPath } }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${PRODUCT_NAME}` : PRODUCT_NAME
})

export default router
