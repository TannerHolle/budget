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
export const getInviteCode = (budgetId) => api.get(`/budgets/${budgetId}/invite-code`)
export const regenerateInviteCode = (budgetId) => api.post(`/budgets/${budgetId}/regenerate-invite-code`)
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

// Teller
export const createLinkToken = (budgetId) => api.post('/teller/create-link-token', { budgetId })
export const exchangePublicToken = (accessToken, metadata, budgetId) => api.post('/teller/exchange-public-token', { access_token: accessToken, metadata, budgetId })
export const getTellerAccounts = (budgetId) => api.get('/teller/accounts', { params: { budgetId } })
export const getTellerTransactions = (startDate, endDate, budgetId) => api.get('/teller/transactions', { params: { start_date: startDate, end_date: endDate, budgetId } })
export const syncTellerTransactions = (budgetId, startDate, endDate) => api.post('/teller/sync-transactions', { budgetId, start_date: startDate, end_date: endDate })
export const createExpensesFromTransactions = (budgetId, transactions) => api.post('/expenses/bulk', { budgetId, transactions })
export const removeTellerConnection = (connectionId, budgetId) => api.delete(`/teller/remove-connection/${connectionId}`, { params: { budgetId } })

export default api
