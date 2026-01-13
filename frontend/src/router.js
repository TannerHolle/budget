import { createRouter, createWebHistory } from 'vue-router'
import BudgetView from './components/BudgetView.vue'
import BankConnectionsView from './components/BankConnectionsView.vue'
import LoginView from './components/LoginView.vue'
import NetWorthView from './components/NetWorthView.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/',
    name: 'Budget',
    component: BudgetView,
    meta: { requiresAuth: true }
  },
  {
    path: '/bank-connections',
    name: 'BankConnections',
    component: BankConnectionsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/net-worth',
    name: 'NetWorth',
    component: NetWorthView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Preserve invite code in URL if present
    const inviteCode = new URLSearchParams(window.location.search).get('invite')
    if (inviteCode) {
      next(`/login?invite=${inviteCode}`)
    } else {
      next('/login')
    }
  } else if (to.path === '/login' && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
