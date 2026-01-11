<template>
  <div class="budget-view">
    <!-- Summary Cards -->
    <div class="grid grid-3 summary-grid">
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
      <div class="budget-card-header">
        <select v-if="months.length > 1" v-model="selectedMonth" @change="loadData" class="month-select">
          <option v-for="month in months" :key="month.value" :value="month.value">
            {{ month.label }}
          </option>
        </select>
        <span v-else class="month-display">{{ months[0]?.label || 'No months available' }}</span>
        <div class="budget-card-actions">
          <button @click="showAddExpenseModal = true" class="btn btn-primary">
            + Add Expense
          </button>
          <button @click="showAddCategoryModal = true" class="btn btn-secondary">
            + Add Category
          </button>
        </div>
      </div>
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
            :class="{ 'over-budget': item.actual > item.budget && item.budget > 0, 'clickable-row': true }"
            @click="showCategoryExpenses(item.category)"
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
            <td class="actions" @click.stop>
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
      <div class="rollover-legend">
        <span class="legend-text">↻ = the amounts in these categories roll over month to month</span>
      </div>
    </div>

    <!-- This Month's Expenses -->
    <div class="card">
      <h3>This Month's Expenses</h3>
      <div class="expenses-list">
        <div
          v-for="expense in thisMonthsExpenses"
          :key="expense._id"
          class="expense-item"
        >
          <div class="expense-info">
            <div class="expense-details">
              <p class="expense-description">{{ expense.description }}</p>
              <p class="expense-meta">
                {{ expense.category.name }} • {{ formatDate(expense.date) }}
                <span v-if="expense.createdBy && hasMultipleUsers" class="expense-creator">
                  • by {{ expense.createdBy.name }}
                </span>
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
        <p v-if="thisMonthsExpenses.length === 0" class="empty-state">
          No expenses for {{ months.find(m => m.value === selectedMonth)?.label || 'this month' }} yet.
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
            <button 
              v-if="!editingCategory" 
              type="button" 
              @click="saveCategoryAndCreateAnother" 
              class="btn btn-primary"
            >
              Save and Create Another
            </button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Category Expenses Modal -->
    <div v-if="showCategoryExpensesModal" class="modal-overlay" @click.self="closeCategoryExpensesModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ selectedCategoryForExpenses?.name }} Expenses</h2>
          <button @click="closeCategoryExpensesModal" class="close-btn">×</button>
        </div>
        <div class="category-expenses-list">
          <div
            v-for="expense in categoryExpenses"
            :key="expense._id"
            class="expense-item"
          >
            <div class="expense-info">
              <div class="expense-details">
                <p class="expense-description">{{ expense.description }}</p>
                <p class="expense-meta">
                  {{ formatDate(expense.date) }}
                  <span v-if="expense.createdBy && hasMultipleUsers" class="expense-creator">
                    • by {{ expense.createdBy.name }}
                  </span>
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
          <p v-if="categoryExpenses.length === 0" class="empty-state">
            No expenses in this category for {{ months.find(m => m.value === selectedMonth)?.label || 'this month' }}.
          </p>
        </div>
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
            <label>Date</label>
            <input
              type="date"
              v-model="expenseForm.date"
              required
            />
          </div>
          <div class="form-group">
            <label>Category</label>
            <div class="searchable-select">
              <input
                type="text"
                :value="selectedCategoryName || categorySearch"
                @input="categorySearch = $event.target.value; if (selectedCategoryName) { expenseForm.category = ''; selectedCategoryName = ''; }; showCategoryDropdown = true; highlightedCategoryIndex = -1"
                @focus="showCategoryDropdown = true; if (selectedCategoryName) { categorySearch = ''; }; highlightedCategoryIndex = -1"
                @keydown="handleCategoryKeydown"
                :placeholder="selectedCategoryName ? '' : 'Search or select a category'"
                class="select-input"
              />
              <input type="hidden" :value="expenseForm.category" required />
              <div v-if="showCategoryDropdown" class="select-dropdown">
                <div
                  v-for="(cat, index) in filteredCategories"
                  :key="cat._id"
                  @click="selectCategory(cat._id, cat.name)"
                  class="select-option"
                  :class="{ 
                    'selected': expenseForm.category === cat._id,
                    'highlighted': highlightedCategoryIndex === index
                  }"
                  :id="`category-option-${index}`"
                >
                  {{ cat.name }}
                </div>
                <div v-if="filteredCategories.length === 0" class="select-option no-results">
                  No categories found
                </div>
              </div>
            </div>
          </div>
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
          <div class="modal-actions">
            <button type="button" @click="closeExpenseModal" class="btn btn-secondary">
              Cancel
            </button>
            <button 
              v-if="!editingExpense" 
              type="button" 
              @click="saveExpenseAndCreateAnother" 
              class="btn btn-primary"
            >
              Save and Create Another
            </button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {
  getBudgets,
  getBudget,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getExpenseMonths
} from '../api/api'

export default {
  name: 'BudgetView',
  data() {
    const now = new Date()
    return {
      budgets: [],
      selectedBudgetId: localStorage.getItem('budgetId') || null,
      categories: [],
      expenses: [],
      expensesByCategory: [],
      expenseMonths: [],
      showAddCategoryModal: false,
      showAddExpenseModal: false,
      editingCategory: null,
      editingExpense: null,
      openCategoryMenu: null,
      openExpenseMenu: null,
      categorySearch: '',
      showCategoryDropdown: false,
      selectedCategoryName: '',
      highlightedCategoryIndex: -1,
      hasMultipleUsers: false,
      showCategoryExpensesModal: false,
      selectedCategoryForExpenses: null,
      selectedMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      categoryForm: {
        name: '',
        budget: 0,
        rollover: false
      },
      expenseForm: {
        description: '',
        amount: 0,
        category: '',
        date: new Date().toISOString().split('T')[0]
      }
    }
  },

  computed: {
    months() {
      const currentDate = new Date()
      const currentMonthValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      
      // Create a Set of months that have expenses
      const monthsWithExpenses = new Set(
        this.expenseMonths.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`)
      )
      
      // Always include current month
      monthsWithExpenses.add(currentMonthValue)
      
      // Convert Set to array and create month objects
      const allMonths = Array.from(monthsWithExpenses)
        .map(value => {
          const [year, month] = value.split('-')
          const date = new Date(parseInt(year), parseInt(month) - 1, 1)
          return {
            value,
            label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            date
          }
        })
        .sort((a, b) => b.date - a.date) // Sort descending (newest first)
      
      return allMonths.map(({ value, label }) => ({ value, label }))
    },
    budgetData() {
      const data = this.categories.map(category => {
        const expenseData = this.expensesByCategory.find(
          exp => String(exp.category._id) === String(category._id)
        )
        return {
          category,
          budget: category.budget || 0,
          actual: expenseData ? expenseData.total : 0
        }
      })
      return data.sort((a, b) => b.budget - a.budget)
    },
    totalBudget() {
      return this.budgetData.reduce((sum, item) => sum + item.budget, 0)
    },
    totalActual() {
      return this.budgetData.reduce((sum, item) => sum + item.actual, 0)
    },
    remaining() {
      return this.totalBudget - this.totalActual
    },
    filteredCategories() {
      if (!this.categorySearch) {
        return this.categories
      }
      const search = this.categorySearch.toLowerCase()
      return this.categories.filter(cat => 
        cat.name.toLowerCase().includes(search)
      )
    },
    thisMonthsExpenses() {
      const [year, month] = this.selectedMonth.split('-')
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      
      return this.expenses.filter(expense => {
        // Check if date is in selected month
        const expenseDate = new Date(expense.date)
        const expenseMonth = expenseDate.getUTCMonth() + 1
        const expenseYear = expenseDate.getUTCFullYear()
        
        return expenseMonth === monthNum && expenseYear === yearNum
      }).sort((a, b) => new Date(b.date) - new Date(a.date))
    },
    categoryExpenses() {
      if (!this.selectedCategoryForExpenses) return []
      
      // Filter by selected month and category
      const [year, month] = this.selectedMonth.split('-')
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      
      return this.expenses.filter(expense => {
        // Check if date is in selected month
        const expenseDate = new Date(expense.date)
        const expenseMonth = expenseDate.getUTCMonth() + 1
        const expenseYear = expenseDate.getUTCFullYear()
        
        // Check if category matches
        const categoryMatches = String(expense.category._id) === String(this.selectedCategoryForExpenses._id)
        
        // Both month and category must match
        return expenseMonth === monthNum && expenseYear === yearNum && categoryMatches
      }).sort((a, b) => new Date(b.date) - new Date(a.date))
    }
  },

  methods: {
    async loadBudgets() {
      try {
        const res = await getBudgets()
        this.budgets = res.data
        if (this.budgets.length > 0) {
          // User only has one budget, use it automatically
          this.selectedBudgetId = this.budgets[0]._id
          localStorage.setItem('budgetId', this.budgets[0]._id)
          await this.loadData()
        }
      } catch (error) {
        console.error('Error loading budgets:', error)
      }
    },
    async loadData() {
      if (!this.selectedBudgetId) return
      
      try {
        const [year, month] = this.selectedMonth.split('-')
        const [catsRes, expRes, expByCatRes, monthsRes, budgetRes] = await Promise.all([
          getCategories(this.selectedBudgetId),
          getExpenses(this.selectedBudgetId),
          getExpensesByCategory({ month, year, budgetId: this.selectedBudgetId }),
          getExpenseMonths(this.selectedBudgetId),
          getBudget(this.selectedBudgetId)
        ])
        this.categories = catsRes.data
        this.expenses = expRes.data
        this.expensesByCategory = expByCatRes.data
        this.expenseMonths = monthsRes.data
        
        // Calculate total unique users (owner + members)
        const budget = budgetRes.data
        const uniqueUserIds = new Set()
        if (budget.owner) {
          uniqueUserIds.add(String(budget.owner._id || budget.owner))
        }
        if (budget.members) {
          budget.members.forEach(member => {
            if (member.user) {
              uniqueUserIds.add(String(member.user._id || member.user))
            }
          })
        }
        this.hasMultipleUsers = uniqueUserIds.size > 1
      } catch (error) {
        console.error('Error loading data:', error)
      }
    },

    async saveCategory() {
      if (!this.selectedBudgetId) return
      
      try {
        if (this.editingCategory) {
          await updateCategory(this.editingCategory._id, this.categoryForm)
        } else {
          await createCategory({ ...this.categoryForm, budgetId: this.selectedBudgetId })
        }
        await this.loadData()
        this.closeCategoryModal()
      } catch (error) {
        console.error('Error saving category:', error)
      }
    },
    async saveCategoryAndCreateAnother() {
      if (!this.selectedBudgetId) return
      if (this.editingCategory) return // Only allow when creating, not editing
      
      // Validate form
      if (!this.categoryForm.name) {
        return // Let HTML5 validation handle this
      }
      
      try {
        await createCategory({ ...this.categoryForm, budgetId: this.selectedBudgetId })
        await this.loadData()
        // Reset form but keep modal open
        this.categoryForm = {
          name: '',
          budget: 0,
          rollover: false
        }
      } catch (error) {
        console.error('Error saving category:', error)
      }
    },
    editCategory(category) {
      this.editingCategory = category
      this.categoryForm = {
        name: category.name,
        budget: category.budget || 0,
        rollover: category.rollover || false
      }
      this.showAddCategoryModal = true
    },
    selectCategory(categoryId, categoryName) {
      this.expenseForm.category = categoryId
      this.selectedCategoryName = categoryName
      this.categorySearch = ''
      this.showCategoryDropdown = false
      this.highlightedCategoryIndex = -1
    },
    showCategoryExpenses(category) {
      this.selectedCategoryForExpenses = category
      this.showCategoryExpensesModal = true
    },
    closeCategoryExpensesModal() {
      this.showCategoryExpensesModal = false
      this.selectedCategoryForExpenses = null
      this.openExpenseMenu = null
    },
    handleCategoryKeydown(event) {
      if (!this.showCategoryDropdown || this.filteredCategories.length === 0) {
        if (event.key === 'Enter') {
          event.preventDefault()
        }
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        this.highlightedCategoryIndex = Math.min(
          this.highlightedCategoryIndex + 1,
          this.filteredCategories.length - 1
        )
        // Scroll highlighted item into view
        this.$nextTick(() => {
          const element = document.getElementById(`category-option-${this.highlightedCategoryIndex}`)
          if (element) {
            element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        })
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        this.highlightedCategoryIndex = Math.max(this.highlightedCategoryIndex - 1, -1)
        // Scroll highlighted item into view
        if (this.highlightedCategoryIndex >= 0) {
          this.$nextTick(() => {
            const element = document.getElementById(`category-option-${this.highlightedCategoryIndex}`)
            if (element) {
              element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
          })
        }
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (this.highlightedCategoryIndex >= 0 && this.highlightedCategoryIndex < this.filteredCategories.length) {
          const cat = this.filteredCategories[this.highlightedCategoryIndex]
          this.selectCategory(cat._id, cat.name)
        } else if (this.filteredCategories.length === 1) {
          // If only one category, select it
          const cat = this.filteredCategories[0]
          this.selectCategory(cat._id, cat.name)
        }
      } else if (event.key === 'Escape') {
        event.preventDefault()
        this.showCategoryDropdown = false
        this.highlightedCategoryIndex = -1
      }
    },

    editExpense(expense) {
      this.editingExpense = expense
      this.expenseForm = {
        description: expense.description,
        amount: expense.amount,
        category: expense.category._id,
        date: new Date(expense.date).toISOString().split('T')[0]
      }
      this.selectedCategoryName = expense.category.name
      this.categorySearch = ''
      this.showCategoryDropdown = false
      this.showAddExpenseModal = true
    },
    toggleCategoryMenu(categoryId) {
      this.openCategoryMenu = this.openCategoryMenu === categoryId ? null : categoryId
      this.openExpenseMenu = null
    },
    toggleExpenseMenu(expenseId) {
      this.openExpenseMenu = this.openExpenseMenu === expenseId ? null : expenseId
      this.openCategoryMenu = null
    },
    closeCategoryMenu() {
      this.openCategoryMenu = null
    },
    closeExpenseMenu() {
      this.openExpenseMenu = null
    },
    async saveExpense() {
      if (!this.selectedBudgetId) return
      
      try {
        const data = {
          ...this.expenseForm,
          date: new Date(this.expenseForm.date),
          budgetId: this.selectedBudgetId
        }
        if (this.editingExpense) {
          await updateExpense(this.editingExpense._id, data)
        } else {
          await createExpense(data)
        }
        await this.loadData()
        this.closeExpenseModal()
      } catch (error) {
        console.error('Error saving expense:', error)
      }
    },
    async saveExpenseAndCreateAnother() {
      if (!this.selectedBudgetId) return
      if (this.editingExpense) return // Only allow when creating, not editing
      
      // Validate form
      if (!this.expenseForm.description || !this.expenseForm.amount || !this.expenseForm.category || !this.expenseForm.date) {
        return // Let HTML5 validation handle this
      }
      
      try {
        const data = {
          ...this.expenseForm,
          date: new Date(this.expenseForm.date),
          budgetId: this.selectedBudgetId
        }
        await createExpense(data)
        await this.loadData()
        // Reset form but keep modal open
        this.expenseForm = {
          description: '',
          amount: 0,
          category: '',
          date: new Date().toISOString().split('T')[0]
        }
        this.categorySearch = ''
        this.selectedCategoryName = ''
        this.showCategoryDropdown = false
        this.highlightedCategoryIndex = -1
      } catch (error) {
        console.error('Error saving expense:', error)
      }
    },
    async handleDeleteCategory(category) {
      if (confirm(`Are you sure you want to delete "${category.name}"? This will also delete all expenses in this category.`)) {
        try {
          await deleteCategory(category._id)
          await this.loadData()
        } catch (error) {
          console.error('Error deleting category:', error)
          alert('Error deleting category. Please try again.')
        }
      }
    },
    async handleDeleteExpense(expense) {
      if (confirm(`Are you sure you want to delete this expense: "${expense.description}"?`)) {
        try {
          await deleteExpense(expense._id)
          await this.loadData()
        } catch (error) {
          console.error('Error deleting expense:', error)
          alert('Error deleting expense. Please try again.')
        }
      }
    },
    closeCategoryModal() {
      this.showAddCategoryModal = false
      this.editingCategory = null
      this.categoryForm = {
        name: '',
        budget: 0,
        rollover: false
      }
    },
    closeExpenseModal() {
      this.showAddExpenseModal = false
      this.editingExpense = null
      this.expenseForm = {
        description: '',
        amount: 0,
        category: '',
        date: new Date().toISOString().split('T')[0]
      }
      this.categorySearch = ''
      this.selectedCategoryName = ''
      this.showCategoryDropdown = false
      this.highlightedCategoryIndex = -1
    },
    formatDate(date) {
      const d = new Date(date)
      // Use UTC methods to avoid timezone conversion issues
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
    },
    handleClickOutside(event) {
      if (!event.target.closest('.menu-container')) {
        this.openCategoryMenu = null
        this.openExpenseMenu = null
      }
      if (!event.target.closest('.searchable-select')) {
        this.showCategoryDropdown = false
      }
    }
  },
  mounted() {
    this.loadBudgets()
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  }
}
</script>

<style scoped>
.budget-view {
  max-width: 1400px;
  margin: 0 auto;
}

.month-select {
  padding: 0.5rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.month-display {
  padding: 0.5rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
  display: inline-block;
}

.month-select:focus {
  outline: none;
  border-color: #475569;
}

.summary-card {
  text-align: center;
  padding: 1rem;
}

.summary-card h3 {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-card .amount {
  font-size: 1.5rem;
  font-weight: 700;
}

.summary-grid {
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.budget-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.budget-card-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.budget-card-actions .btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.budget-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0;
}

.budget-table thead {
  background: #f9fafb;
}

.budget-table th {
  padding: 0.375rem 1rem;
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

.budget-table tbody tr:nth-child(even) {
  background: #f9fafb;
}

.budget-table tbody tr:nth-child(odd) {
  background: white;
}

.budget-table tbody tr:hover {
  background: #f3f4f6;
}

.budget-table tbody tr.clickable-row {
  cursor: pointer;
}

.budget-table tbody tr.clickable-row:hover {
  background: #e5e7eb;
}

.budget-table tbody tr.over-budget {
  background: #fef2f2;
}

.budget-table tbody tr.over-budget:nth-child(even) {
  background: #fee2e2;
}

.budget-table td {
  padding: 0.375rem 1rem;
  vertical-align: middle;
}

.category-name {
  font-weight: 600;
  color: #111827;
}

.rollover-badge {
  margin-left: 0.5rem;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 600;
}

.rollover-legend {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #6b7280;
}

.rollover-legend .rollover-badge {
  margin-left: 0;
  font-size: 1rem;
}

.legend-text {
  color: #6b7280;
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
  padding: 0.375rem 1rem;
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

.expense-creator {
  color: #475569;
  font-weight: 500;
}

.category-expenses-list {
  max-height: 60vh;
  overflow-y: auto;
  margin-top: 1rem;
}

.category-expenses-list .expense-item {
  margin-bottom: 0.75rem;
}

.searchable-select {
  position: relative;
  width: 100%;
}

.select-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: #475569;
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
}

.select-option {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 1rem;
  color: #374151;
}

.select-option:hover {
  background: #f9fafb;
}

.select-option.selected {
  background: #f3f4f6;
  font-weight: 600;
}

.select-option.highlighted {
  background: #e5e7eb;
  font-weight: 500;
}

.select-option.no-results {
  color: #9ca3af;
  cursor: default;
}

.select-option.no-results:hover {
  background: white;
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
  .budget-card-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .month-select,
  .month-display,
  .budget-card-actions {
    width: 100%;
  }
  
  .budget-card-actions .btn {
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
