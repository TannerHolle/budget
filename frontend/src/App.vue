<template>
  <div id="app">
    <nav class="navbar">
      <div class="container">
        <h1 class="logo">Budget Tracker</h1>
        <div v-if="isAuthenticated" class="navbar-user">
          <span class="user-name">{{ user?.name }}</span>
          <button @click="handleLogout" class="btn btn-secondary btn-sm">Logout</button>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <div class="container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'

export default {
  name: 'App',
  setup() {
    const router = useRouter()
    const { user, isAuthenticated, logout } = useAuth()

    const handleLogout = () => {
      logout()
      router.push('/login')
    }

    return {
      user,
      isAuthenticated,
      handleLogout
    }
  }
}
</script>

<style scoped>
.navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 0.5rem 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.navbar-user .user-name {
  color: #374151;
  font-weight: 500;
}

.navbar-user .btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.logo {
  font-size: 1.25rem;
  color: #667eea;
  margin: 0;
  font-weight: 600;
}

.main-content {
  padding: 2rem 0;
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem 0;
  }
}
</style>
