import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Categories
export const getCategories = () => api.get('/categories')
export const createCategory = (data) => api.post('/categories', data)
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)

// Expenses
export const getExpenses = () => api.get('/expenses')
export const getExpensesByCategory = (params) => api.get('/expenses/by-category', { params })
export const createExpense = (data) => api.post('/expenses', data)
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data)
export const deleteExpense = (id) => api.delete(`/expenses/${id}`)

export default api
