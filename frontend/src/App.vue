<template>
  <div id="app">
    <nav v-if="isAuthenticated" class="navbar">
      <div class="container">
        <div class="navbar-left">
          <h1 class="logo">Budget Tracker</h1>
          <nav class="nav-links">
            <router-link to="/" class="nav-link">Budget/Expenses</router-link>
            <router-link to="/net-worth" class="nav-link">Net Worth</router-link>
            <router-link to="/bank-connections" class="nav-link">Connected Accounts</router-link>
          </nav>
        </div>
        <div class="navbar-user">
          <span class="user-name">{{ user?.name }}</span>
          <button @click="handleLogout" class="btn btn-secondary btn-sm">Logout</button>
        </div>
      </div>
    </nav>
    <main>
      <div class="container">
        <router-view @login="handleLogin" />
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      user: null,
      isAuthenticated: !!localStorage.getItem('token')
    }
  },
  watch: {
    '$route'() {
      this.updateAuthState()
    }
  },
  mounted() {
    this.updateAuthState()
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
    updateAuthState() {
      this.isAuthenticated = !!localStorage.getItem('token')
    },
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
      this.$router.push('/')
    },
    handleLogout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('budgetId')
      this.user = null
      this.isAuthenticated = false
      this.$router.push('/login')
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

.navbar-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: #6b7280;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #374151;
  background: #f3f4f6;
}

.nav-link.router-link-active {
  color: #475569;
  background: #e5e7eb;
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
