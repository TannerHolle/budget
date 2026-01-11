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
    <main>
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
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 768px) {
  .navbar .container {
    padding: 0 2rem;
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
  font-size: 0.875rem;
}

.navbar-user .btn-sm {
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
}

.logo {
  font-size: 1.125rem;
  color: #1e293b;
  margin: 0;
  font-weight: 600;
}


@media (max-width: 768px) {

}
</style>
