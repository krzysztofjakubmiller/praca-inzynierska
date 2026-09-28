import { createRouter, createWebHistory } from 'vue-router'
import { PRODUCT_NAME } from '@/config/product'
import HomeView from '@/views/HomeView.vue'

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
      component: HomeView,
    },
    {
      path: '/wizytowka-a',
      name: 'landing-a',
      component: () => import('@/views/LandingView.vue'),
      meta: { title: 'Wizytówka A' },
    },
    {
      path: '/wizytowka-b',
      name: 'landing-b',
      component: () => import('@/views/LandingView.vue'),
      meta: { title: 'Wizytówka B' },
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
      component: () => import('@/views/BasicMaturaView.vue'),
      meta: { title: 'Matura podstawowa' },
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
      // scrollIntoView respects scroll-margin, which keeps the section clear of the sticky header.
      document.getElementById(decodeURIComponent(to.hash.slice(1)))?.scrollIntoView()
      return false
    }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${PRODUCT_NAME}` : PRODUCT_NAME
})

export default router
