<template>
  <div class="budget-view">
    <div class="header-section">
      <h2>Budget Overview</h2>
      <div class="header-actions">
        <select v-model="selectedMonth" @change="loadData" class="month-select">
          <option v-for="month in months" :key="month.value" :value="month.value">
            {{ month.label }}
          </option>
        </select>
        <button @click="showAddExpenseModal = true" class="btn btn-primary">
          + Add Expense
        </button>
        <button @click="showAddCategoryModal = true" class="btn btn-secondary">
          + Add Category
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-3">
      <div class="card summary-card">
        <h3>Total Budget</h3>
        <p class="amount">${{ totalBudget.toFixed(2) }}</p>
      </div>
      <div class="card summary-card">
        <h3>Total Actual</h3>
        <p class="amount amount-negative">${{ totalActual.toFixed(2) }}</p>
      </div>
      <div class="card summary-card">
        <h3>Remaining</h3>
        <p
          class="amount"
          :class="remaining >= 0 ? 'amount-positive' : 'amount-negative'"
        >
          ${{ remaining.toFixed(2) }}
        </p>
      </div>
    </div>

    <!-- Budget Table -->
    <div class="card">
      <h3>Budget vs Actual</h3>
      <table class="budget-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Expected</th>
            <th>Expected %</th>
            <th>Actual</th>
            <th>Actual %</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in budgetData"
            :key="item.category._id"
            :class="{ 'over-budget': item.actual > item.budget && item.budget > 0 }"
          >
            <td>
              <span class="category-name">{{ item.category.name }}</span>
              <span v-if="item.category.rollover" class="rollover-badge" title="Rollover enabled">↻</span>
            </td>
            <td>
              <span v-if="item.budget > 0">${{ item.budget.toFixed(2) }}</span>
              <span v-else class="empty-value">-</span>
            </td>
            <td>
              <span v-if="totalBudget > 0">
                {{ ((item.budget / totalBudget) * 100).toFixed(1) }}%
              </span>
              <span v-else class="empty-value">-</span>
            </td>
            <td>
              <span v-if="item.actual > 0" class="actual-value">${{ item.actual.toFixed(2) }}</span>
              <span v-else class="empty-value">-</span>
            </td>
            <td>
              <span v-if="item.actual > 0" class="actual-value">
                {{ item.budget > 0 ? ((item.actual / item.budget) * 100).toFixed(1) : '0.0' }}%
              </span>
              <span v-else class="empty-value">0.0%</span>
            </td>
            <td class="actions">
              <div class="menu-container">
                <button @click.stop="toggleCategoryMenu(item.category._id)" class="btn-menu" title="Menu">⋯</button>
                <div v-if="openCategoryMenu === item.category._id" class="dropdown-menu">
                  <button @click="editCategory(item.category); closeCategoryMenu()" class="dropdown-item">Edit</button>
                  <button @click="handleDeleteCategory(item.category); closeCategoryMenu()" class="dropdown-item delete">Delete</button>
                </div>
              </div>
            </td>
          </tr>
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td><strong>${{ totalBudget.toFixed(2) }}</strong></td>
            <td><strong v-if="totalBudget > 0">100.0%</strong><strong v-else>-</strong></td>
            <td>
              <strong v-if="totalActual > 0" class="actual-value">${{ totalActual.toFixed(2) }}</strong>
              <strong v-else>-</strong>
            </td>
            <td>
              <strong v-if="totalBudget > 0 && totalActual > 0" class="actual-value">
                {{ ((totalActual / totalBudget) * 100).toFixed(1) }}%
              </strong>
              <strong v-else-if="totalBudget > 0">0.0%</strong>
              <strong v-else>-</strong>
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Recent Expenses -->
    <div class="card">
      <h3>Recent Expenses</h3>
      <div class="expenses-list">
        <div
          v-for="expense in recentExpenses"
          :key="expense._id"
          class="expense-item"
        >
          <div class="expense-info">
            <div class="expense-details">
              <p class="expense-description">{{ expense.description }}</p>
              <p class="expense-meta">
                {{ expense.category.name }} • {{ formatDate(expense.date) }}
              </p>
            </div>
          </div>
          <div class="expense-actions">
            <div class="expense-amount">${{ expense.amount.toFixed(2) }}</div>
            <div class="menu-container">
              <button @click.stop="toggleExpenseMenu(expense._id)" class="btn-menu" title="Menu">⋯</button>
              <div v-if="openExpenseMenu === expense._id" class="dropdown-menu">
                <button @click="editExpense(expense); closeExpenseMenu()" class="dropdown-item">Edit</button>
                <button @click="handleDeleteExpense(expense); closeExpenseMenu()" class="dropdown-item delete">Delete</button>
              </div>
            </div>
          </div>
        </div>
        <p v-if="recentExpenses.length === 0" class="empty-state">
          No expenses yet. Add your first expense!
        </p>
      </div>
    </div>

    <!-- Add Category Modal -->
    <div v-if="showAddCategoryModal" class="modal-overlay" @click.self="closeCategoryModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingCategory ? 'Edit' : 'Add' }} Category</h2>
          <button @click="closeCategoryModal" class="close-btn">×</button>
        </div>
        <form @submit.prevent="saveCategory">
          <div class="form-group">
            <label>Name</label>
            <input v-model="categoryForm.name" required />
          </div>
          <div class="form-group">
            <label>Budget (Expected Amount)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              v-model.number="categoryForm.budget"
            />
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="categoryForm.rollover" />
              <span>Rollover unused budget to next month</span>
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" @click="closeCategoryModal" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Expense Modal -->
    <div v-if="showAddExpenseModal" class="modal-overlay" @click.self="closeExpenseModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingExpense ? 'Edit' : 'Add' }} Expense</h2>
          <button @click="closeExpenseModal" class="close-btn">×</button>
        </div>
        <form @submit.prevent="saveExpense">
          <div class="form-group">
            <label>Description</label>
            <input v-model="expenseForm.description" required />
          </div>
          <div class="form-group">
            <label>Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              v-model.number="expenseForm.amount"
              required
            />
          </div>
          <div class="form-group">
            <label>Category</label>
            <select v-model="expenseForm.category" required>
              <option value="">Select a category</option>
              <option
                v-for="cat in categories"
                :key="cat._id"
                :value="cat._id"
              >
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input
              type="date"
              v-model="expenseForm.date"
              required
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="closeExpenseModal" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByCategory
} from '../api/api'

export default {
  name: 'BudgetView',
  setup() {
    const categories = ref([])
    const expenses = ref([])
    const expensesByCategory = ref([])
    const recentExpenses = ref([])
    const showAddCategoryModal = ref(false)
    const showAddExpenseModal = ref(false)
    const editingCategory = ref(null)
    const editingExpense = ref(null)
    const openCategoryMenu = ref(null)
    const openExpenseMenu = ref(null)

    const now = new Date()
    const selectedMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

    const months = computed(() => {
      const monthsList = []
      const currentDate = new Date()
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        monthsList.push({ value, label })
      }
      return monthsList
    })

    const categoryForm = ref({
      name: '',
      budget: 0,
      rollover: false
    })

    const expenseForm = ref({
      description: '',
      amount: 0,
      category: '',
      date: new Date().toISOString().split('T')[0]
    })

    const budgetData = computed(() => {
      const data = categories.value.map(category => {
        const expenseData = expensesByCategory.value.find(
          exp => exp.category._id === category._id
        )
        return {
          category,
          budget: category.budget || 0,
          actual: expenseData ? expenseData.total : 0
        }
      })
      return data.sort((a, b) => b.budget - a.budget)
    })

    const totalBudget = computed(() => {
      return budgetData.value.reduce((sum, item) => sum + item.budget, 0)
    })

    const totalActual = computed(() => {
      return budgetData.value.reduce((sum, item) => sum + item.actual, 0)
    })

    const remaining = computed(() => {
      return totalBudget.value - totalActual.value
    })

    const loadData = async () => {
      try {
        const [month, year] = selectedMonth.value.split('-')
        const [catsRes, expRes, expByCatRes] = await Promise.all([
          getCategories(),
          getExpenses(),
          getExpensesByCategory({ params: { month, year } })
        ])
        categories.value = catsRes.data
        expenses.value = expRes.data
        expensesByCategory.value = expByCatRes.data
        
        // Get recent expenses (last 10)
        recentExpenses.value = expRes.data.slice(0, 10)
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    const saveCategory = async () => {
      try {
        if (editingCategory.value) {
          await updateCategory(editingCategory.value._id, categoryForm.value)
        } else {
          await createCategory(categoryForm.value)
        }
        await loadData()
        closeCategoryModal()
      } catch (error) {
        console.error('Error saving category:', error)
      }
    }

    const editCategory = (category) => {
      editingCategory.value = category
      categoryForm.value = {
        name: category.name,
        budget: category.budget || 0,
        rollover: category.rollover || false
      }
      showAddCategoryModal.value = true
    }

    const editExpense = (expense) => {
      editingExpense.value = expense
      expenseForm.value = {
        description: expense.description,
        amount: expense.amount,
        category: expense.category._id,
        date: new Date(expense.date).toISOString().split('T')[0]
      }
      showAddExpenseModal.value = true
    }

    const toggleCategoryMenu = (categoryId) => {
      openCategoryMenu.value = openCategoryMenu.value === categoryId ? null : categoryId
      openExpenseMenu.value = null
    }

    const toggleExpenseMenu = (expenseId) => {
      openExpenseMenu.value = openExpenseMenu.value === expenseId ? null : expenseId
      openCategoryMenu.value = null
    }

    const closeCategoryMenu = () => {
      openCategoryMenu.value = null
    }

    const closeExpenseMenu = () => {
      openExpenseMenu.value = null
    }

    const saveExpense = async () => {
      try {
        const data = {
          ...expenseForm.value,
          date: new Date(expenseForm.value.date)
        }
        if (editingExpense.value) {
          await updateExpense(editingExpense.value._id, data)
        } else {
          await createExpense(data)
        }
        await loadData()
        closeExpenseModal()
      } catch (error) {
        console.error('Error saving expense:', error)
      }
    }

    const handleDeleteCategory = async (category) => {
      if (confirm(`Are you sure you want to delete "${category.name}"? This will also delete all expenses in this category.`)) {
        try {
          await deleteCategory(category._id)
          await loadData()
        } catch (error) {
          console.error('Error deleting category:', error)
          alert('Error deleting category. Please try again.')
        }
      }
    }

    const handleDeleteExpense = async (expense) => {
      if (confirm(`Are you sure you want to delete this expense: "${expense.description}"?`)) {
        try {
          await deleteExpense(expense._id)
          await loadData()
        } catch (error) {
          console.error('Error deleting expense:', error)
          alert('Error deleting expense. Please try again.')
        }
      }
    }

    const closeCategoryModal = () => {
      showAddCategoryModal.value = false
      editingCategory.value = null
      categoryForm.value = {
        name: '',
        budget: 0,
        rollover: false
      }
    }

    const closeExpenseModal = () => {
      showAddExpenseModal.value = false
      editingExpense.value = null
      expenseForm.value = {
        description: '',
        amount: 0,
        category: '',
        date: new Date().toISOString().split('T')[0]
      }
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    // Close menus when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.menu-container')) {
        openCategoryMenu.value = null
        openExpenseMenu.value = null
      }
    }

    onMounted(() => {
      loadData()
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      categories,
      expenses,
      expensesByCategory,
      recentExpenses,
      budgetData,
      totalBudget,
      totalActual,
      remaining,
      selectedMonth,
      months,
      showAddCategoryModal,
      showAddExpenseModal,
      editingCategory,
      editingExpense,
      categoryForm,
      expenseForm,
      saveCategory,
      editCategory,
      handleDeleteCategory,
      toggleCategoryMenu,
      closeCategoryMenu,
      saveExpense,
      editExpense,
      handleDeleteExpense,
      toggleExpenseMenu,
      closeExpenseMenu,
      openCategoryMenu,
      openExpenseMenu,
      closeCategoryModal,
      closeExpenseModal,
      formatDate,
      loadData
    }
  }
}
</script>

<style scoped>
.budget-view {
  max-width: 1400px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-section h2 {
  color: white;
  font-size: 2rem;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.month-select {
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.month-select:focus {
  outline: none;
  border-color: #667eea;
}

.summary-card {
  text-align: center;
}

.summary-card h3 {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-card .amount {
  font-size: 2rem;
  font-weight: 700;
}

.budget-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.budget-table thead {
  background: #f9fafb;
}

.budget-table th {
  padding: 0.875rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e5e7eb;
}

.budget-table tbody tr {
  border-bottom: 1px solid #e5e7eb;
}

.budget-table tbody tr:hover {
  background: #f9fafb;
}

.budget-table tbody tr.over-budget {
  background: #fef2f2;
}

.budget-table td {
  padding: 1rem;
  vertical-align: middle;
}

.category-name {
  font-weight: 600;
  color: #111827;
}

.rollover-badge {
  margin-left: 0.5rem;
  color: #667eea;
  font-size: 0.875rem;
  font-weight: 600;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
  margin-bottom: 0;
}

.empty-value {
  color: #9ca3af;
}

.actual-value {
  background: #dcfce7;
  color: #059669;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  display: inline-block;
}

.budget-table tbody tr.over-budget .actual-value {
  background: #fee2e2;
  color: #ef4444;
}

.total-row {
  background: #f9fafb;
  border-top: 2px solid #e5e7eb;
}

.total-row td {
  padding: 1rem;
  font-weight: 700;
  font-size: 1rem;
}

.actions {
  position: relative;
}

.menu-container {
  position: relative;
  display: inline-block;
}

.btn-menu {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  line-height: 1;
  width: 32px;
  height: 32px;
}

.btn-menu:hover {
  background: #f3f4f6;
  color: #374151;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-width: 120px;
  z-index: 10;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f9fafb;
}

.dropdown-item.delete {
  color: #ef4444;
}

.dropdown-item.delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

.expenses-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.expense-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.expense-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.expense-actions .menu-container {
  position: relative;
}

.expense-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.expense-details {
  flex: 1;
}

.expense-description {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.expense-meta {
  font-size: 0.875rem;
  color: #6b7280;
}

.expense-amount {
  font-weight: 700;
  font-size: 1.125rem;
  color: #ef4444;
}

.empty-state {
  text-align: center;
  color: #6b7280;
  padding: 2rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-section h2 {
    font-size: 1.75rem;
  }
  
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .month-select,
  .header-actions .btn {
    width: 100%;
  }
  
  .grid-3 {
    grid-template-columns: 1fr;
  }
  
  .budget-table {
    font-size: 0.875rem;
  }
  
  .budget-table th,
  .budget-table td {
    padding: 0.75rem 0.5rem;
  }
  
  .category-cell {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .expense-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .expense-amount {
    align-self: flex-end;
  }
}
</style>
