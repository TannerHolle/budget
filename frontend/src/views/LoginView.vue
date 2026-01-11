<template>
  <div class="login-view">
    <div class="login-container">
      <h1>Budget Tracker</h1>
      <div class="auth-tabs">
        <button 
          @click="isLogin = true" 
          :class="{ active: isLogin }"
          class="tab-btn"
        >
          Login
        </button>
        <button 
          @click="isLogin = false" 
          :class="{ active: !isLogin }"
          class="tab-btn"
        >
          Sign Up
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="!isLogin" class="form-group">
          <label>Name</label>
          <input 
            v-model="form.name" 
            type="text" 
            required 
            placeholder="Your name"
          />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input 
            v-model="form.email" 
            type="email" 
            required 
            placeholder="your@email.com"
          />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input 
            v-model="form.password" 
            type="password" 
            required 
            placeholder="••••••••"
            minlength="6"
          />
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

export default {
  name: 'LoginView',
  setup() {
    const router = useRouter()
    const { login, signup } = useAuth()
    const isLogin = ref(true)
    const loading = ref(false)
    const error = ref('')
    
    const form = ref({
      name: '',
      email: '',
      password: ''
    })

    const handleSubmit = async () => {
      loading.value = true
      error.value = ''
      
      try {
        if (isLogin.value) {
          await login(form.value.email, form.value.password)
        } else {
          await signup(form.value.name, form.value.email, form.value.password)
        }
        router.push('/')
      } catch (err) {
        error.value = err.response?.data?.error || 'An error occurred'
      } finally {
        loading.value = false
      }
    }

    return {
      isLogin,
      form,
      loading,
      error,
      handleSubmit
    }
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.login-container {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-container h1 {
  text-align: center;
  color: #667eea;
  margin-bottom: 2rem;
  font-size: 2rem;
}

.auth-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #667eea;
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
  font-weight: 600;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .login-container {
    padding: 2rem;
  }
}
</style>
