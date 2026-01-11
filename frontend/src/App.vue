<template>
  <div id="app">
    <nav v-if="isAuthenticated" class="navbar">
      <div class="container">
        <h1 class="logo">Budget Tracker</h1>
        <div class="navbar-user">
          <span class="user-name">{{ user?.name }}</span>
          <button @click="handleLogout" class="btn btn-secondary btn-sm">Logout</button>
        </div>
      </div>
    </nav>
    <main>
      <div class="container">
        <LoginView v-if="!isAuthenticated" @login="handleLogin" />
        <BudgetView v-else />
      </div>
    </main>
  </div>
</template>

<script>
import LoginView from './components/LoginView.vue'
import BudgetView from './components/BudgetView.vue'

export default {
  name: 'App',
  components: {
    LoginView,
    BudgetView
  },
  data() {
    return {
      user: null,
      isAuthenticated: !!localStorage.getItem('token')
    }
  },
  mounted() {
    // Load user from localStorage
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        this.user = JSON.parse(userStr)
      } catch (e) {
        this.user = null
      }
    }
    
    // Try to get current user if token exists but user doesn't
    if (this.isAuthenticated && !this.user) {
      this.loadCurrentUser()
    }
  },
  methods: {
    handleLogin() {
      // Reload user after login
      this.isAuthenticated = true
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          this.user = JSON.parse(userStr)
        } catch (e) {
          this.user = null
        }
      }
    },
    handleLogout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('budgetId')
      this.user = null
      this.isAuthenticated = false
      
      // Clear invite token from URL and redirect to clean login page
      if (window.location.search.includes('invite=')) {
        window.history.replaceState({}, '', window.location.pathname)
      }
    },
    async loadCurrentUser() {
      try {
        const { getCurrentUser } = await import('./api/api')
        const res = await getCurrentUser()
        this.user = res.data
        localStorage.setItem('user', JSON.stringify(res.data))
      } catch (error) {
        // If token is invalid, clear everything
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('budgetId')
        this.user = null
        this.isAuthenticated = false
      }
    }
  }
}
</script>

<style scoped>
.navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 0.375rem 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 768px) {
  .navbar .container {
    padding: 0 1.5rem;
  }
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.navbar-user .user-name {
  color: #374151;
  font-weight: 500;
  font-size: 0.8125rem;
}

.navbar-user .btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
}

.logo {
  font-size: 1rem;
  color: #1e293b;
  margin: 0;
  font-weight: 600;
}


@media (max-width: 768px) {

}
</style>
