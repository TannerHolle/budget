import { ref, computed } from 'vue'
import { register, login as loginApi, getCurrentUser } from '../api/api'

const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
const token = ref(localStorage.getItem('token'))
const budgetId = ref(localStorage.getItem('budgetId'))

// Initialize user from token if available
if (token.value && !user.value) {
  getCurrentUser()
    .then(res => {
      user.value = res.data
      localStorage.setItem('user', JSON.stringify(res.data))
    })
    .catch(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('budgetId')
      localStorage.removeItem('user')
      token.value = null
      budgetId.value = null
      user.value = null
    })
}

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)

  const login = async (email, password, rememberMe = false) => {
    try {
      const res = await loginApi({ email, password, rememberMe })
      token.value = res.data.token
      user.value = res.data.user
      budgetId.value = res.data.budgetId
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.setItem('budgetId', res.data.budgetId || '')
      return res.data
    } catch (error) {
      throw error
    }
  }

  const signup = async (name, email, password) => {
    try {
      const res = await register({ name, email, password })
      token.value = res.data.token
      user.value = res.data.user
      budgetId.value = res.data.budgetId
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.setItem('budgetId', res.data.budgetId || '')
      return res.data
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    budgetId.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('budgetId')
  }

  const setBudgetId = (id) => {
    budgetId.value = id
    localStorage.setItem('budgetId', id || '')
  }

  return {
    user,
    token,
    budgetId,
    isAuthenticated,
    login,
    signup,
    logout,
    setBudgetId
  }
}
