import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('budgetId')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)
export const getCurrentUser = () => api.get('/auth/me')

// Budgets
export const getBudgets = () => api.get('/budgets')
export const getBudget = (id) => api.get(`/budgets/${id}`)
export const createBudget = (data) => api.post('/budgets', data)
export const inviteToBudget = (budgetId, email) => api.post(`/budgets/${budgetId}/invite`, { email })
export const removeMember = (budgetId, userId) => api.delete(`/budgets/${budgetId}/members/${userId}`)

// Categories
export const getCategories = (budgetId) => api.get('/categories', { params: { budgetId } })
export const createCategory = (data) => api.post('/categories', data)
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)
export const reorderCategories = (budgetId, categoryOrders) => api.post('/categories/reorder', { budgetId, categoryOrders })

// Expenses
export const getExpenses = (budgetId) => api.get('/expenses', { params: { budgetId } })
export const getExpensesByCategory = (params) => api.get('/expenses/by-category', { params })
export const getExpenseMonths = (budgetId) => api.get('/expenses/months', { params: { budgetId } })
export const createExpense = (data) => api.post('/expenses', data)
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data)
export const deleteExpense = (id) => api.delete(`/expenses/${id}`)

export default api
