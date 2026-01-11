<template>
  <div class="login-view">
    <div class="login-container">
      <h1>Budget Tracker</h1>
      <div class="auth-tabs">
        <button 
          @click="switchToLogin" 
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
        <div v-if="isLogin" class="form-group remember-me">
          <label class="checkbox-label">
            <input 
              v-model="form.rememberMe" 
              type="checkbox"
            />
            <span>Remember me</span>
          </label>
        </div>
        <div v-if="inviteCode && !isLogin" class="invite-notice">
          You're joining a shared budget!
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
import { login as loginApi, register } from '../api/api'

export default {
  name: 'LoginView',
  data() {
    return {
      isLogin: true,
      loading: false,
      error: '',
      inviteCode: null,
      form: {
        name: '',
        email: '',
        password: '',
        rememberMe: false
      }
    }
  },
  mounted() {
    // Check for invite code in URL
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('invite')
    if (code) {
      this.inviteCode = code
      // Switch to sign up if invite code is present
      this.isLogin = false
    }
  },
  methods: {
    switchToLogin() {
      this.isLogin = true
      this.inviteCode = null
      // Clear invite token from URL when switching to login
      if (window.location.search.includes('invite=')) {
        window.history.replaceState({}, '', window.location.pathname)
      }
    },
    async handleSubmit() {
      this.loading = true
      this.error = ''
      
      try {
        let res
        if (this.isLogin) {
          res = await loginApi({
            email: this.form.email,
            password: this.form.password,
            rememberMe: this.form.rememberMe
          })
        } else {
          res = await register({
            name: this.form.name,
            email: this.form.email,
            password: this.form.password,
            inviteCode: this.inviteCode
          })
        }
        
        // Store auth data in localStorage
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        localStorage.setItem('budgetId', res.data.budgetId || '')
        
        // Emit login event to parent
        this.$emit('login')
      } catch (err) {
        this.error = err.response?.data?.error || 'An error occurred'
      } finally {
        this.loading = false
      }
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
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
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
  color: #1e293b;
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
  color: #475569;
}

.tab-btn.active {
  color: #475569;
  border-bottom-color: #475569;
  font-weight: 600;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.remember-me {
  margin-top: -0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #4b5563;
}

.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  accent-color: #475569;
}

.invite-notice {
  background: #dbeafe;
  color: #1e40af;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: center;
  font-weight: 500;
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
