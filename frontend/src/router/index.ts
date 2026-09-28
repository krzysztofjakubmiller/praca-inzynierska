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
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${PRODUCT_NAME}` : PRODUCT_NAME
})

export default router
