import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'partner',
          name: 'partner',
          component: () => import('@/views/PartnerView.vue'),
        },
        {
          path: 'item',
          name: 'item',
          component: () => import('@/views/ItemView.vue'),
        },
        {
          path: 'process',
          name: 'process',
          component: () => import('@/views/ProcessView.vue'),
        },
        {
          path: 'employee',
          name: 'employee',
          component: () => import('@/views/EmployeeView.vue'),
        },
        {
          path: 'common-code',
          name: 'common-code',
          component: () => import('@/views/CommonCodeView.vue'),
        },
        {
          path: 'quote',
          name: 'quote',
          component: () => import('@/views/QuoteView.vue'),
        },
        {
          path: 'order',
          name: 'order',
          component: () => import('@/views/OrderView.vue'),
        },
        {
          path: 'price',
          name: 'price',
          component: () => import('@/views/PriceView.vue'),
        },
        {
          path: 'shipment',
          name: 'shipment',
          component: () => import('@/views/ShipmentView.vue'),
        },
        {
          path: 'revenue',
          name: 'revenue',
          component: () => import('@/views/RevenueView.vue'),
        },
        {
          path: 'order-fulfillment',
          name: 'order-fulfillment',
          component: () => import('@/views/OrderFulfillmentView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: 'login' }
  }
  if (to.name === 'login' && authStore.isLoggedIn) {
    return { name: 'dashboard' }
  }
})

export default router
