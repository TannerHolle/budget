<template>
  <div class="budget-view">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>
    <template v-else>
      <!-- Summary Cards -->
      <!-- <SummaryCards
        :total-budget="totalBudget"
        :total-actual="totalActual"
        :remaining="remaining"
      /> -->

      <!-- Budget Table -->
    <BudgetTable
      :budget-data="budgetData"
      :total-budget="totalBudget"
      :total-actual="totalActual"
      :months="months"
      :selected-month="selectedMonth"
      :syncing="syncing"
      @update:selectedMonth="selectedMonth = $event"
      @month-changed="handleMonthChange"
      @add-expense="showAddExpenseModal = true"
      @add-category="showAddCategoryModal = true"
      @show-category-expenses="showCategoryExpenses"
      @edit-category="editCategory"
      @delete-category="handleDeleteCategory"
      @reorder-categories="handleReorderCategories"
      @invite-user="showInviteUserModal = true"
      @sync-transactions="syncTransactions"
    />

    <!-- This Month's Expenses -->
    <ExpensesList
      :expenses="thisMonthsExpenses"
      :has-multiple-users="hasMultipleUsers"
      :month-label="months.find(m => m.value === selectedMonth)?.label || ''"
      @edit-expense="editExpense"
      @delete-expense="handleDeleteExpense"
    />

    <!-- Add Category Modal -->
    <CategoryModal
      :show="showAddCategoryModal"
      :editing-category="editingCategory"
      :form="categoryForm"
      @update:form="categoryForm = $event"
      @close="closeCategoryModal"
      @save="saveCategory"
      @save-and-create-another="saveCategoryAndCreateAnother"
    />

    <!-- Category Expenses Modal -->
    <CategoryExpensesModal
      :show="showCategoryExpensesModal"
      :category="selectedCategoryForExpenses"
      :expenses="categoryExpenses"
      :has-multiple-users="hasMultipleUsers"
      :month-label="months.find(m => m.value === selectedMonth)?.label || ''"
      @close="closeCategoryExpensesModal"
      @edit-expense="editExpense"
      @delete-expense="handleDeleteExpense"
    />

    <!-- Add Expense Modal -->
    <ExpenseModal
      :show="showAddExpenseModal"
      :editing-expense="editingExpense"
      :form="expenseForm"
      :categories="categories"
      :selected-category-name="selectedCategoryName"
      @update:form="expenseForm = $event"
      @update:selectedCategoryName="selectedCategoryName = $event"
      @close="closeExpenseModal"
      @save="saveExpense"
      @save-and-create-another="saveExpenseAndCreateAnother"
    />

    <!-- Invite User Modal -->
    <InviteUserModal
      :show="showInviteUserModal"
      :budget-id="selectedBudgetId"
      @close="closeInviteUserModal"
    />

    <!-- Categorize Transactions Modal -->
    <CategorizeTransactionsModal
      :show="showCategorizeModal"
      :transactions="transactionsToCategorize"
      :categories="categories"
      :importing="importing"
      @close="closeCategorizeModal"
      @import="importTransactions"
    />
    </template>
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
  reorderCategories,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getExpenseMonths,
  syncTellerTransactions,
  createExpensesFromTransactions,
} from '../api/api'
import SummaryCards from './SummaryCards.vue'
import BudgetTable from './BudgetTable.vue'
import ExpensesList from './ExpensesList.vue'
import CategoryModal from './CategoryModal.vue'
import CategoryExpensesModal from './CategoryExpensesModal.vue'
import ExpenseModal from './ExpenseModal.vue'
import InviteUserModal from './InviteUserModal.vue'
import CategorizeTransactionsModal from './CategorizeTransactionsModal.vue'

export default {
  name: 'BudgetView',
  components: {
    SummaryCards,
    BudgetTable,
    ExpensesList,
    CategoryModal,
    CategoryExpensesModal,
    ExpenseModal,
    InviteUserModal,
    CategorizeTransactionsModal
  },
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
      showInviteUserModal: false,
      editingCategory: null,
      editingExpense: null,
      hasMultipleUsers: false,
      showCategoryExpensesModal: false,
      selectedCategoryForExpenses: null,
      selectedMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      syncing: false,
      importing: false,
      transactionsToCategorize: [],
      showCategorizeModal: false,
      syncResult: null,
      loading: true,
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
      },
      selectedCategoryName: ''
    }
  },

  computed: {
    months() {
      const currentDate = new Date()
      const currentMonthValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      
      const monthsWithExpenses = new Set(
        this.expenseMonths.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`)
      )
      
      monthsWithExpenses.add(currentMonthValue)
      
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
        .sort((a, b) => b.date - a.date)
      
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
      // Categories are already sorted by order from the backend
      return data
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
    thisMonthsExpenses() {
      const [year, month] = this.selectedMonth.split('-')
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      
      return this.expenses.filter(expense => {
        const expenseDate = new Date(expense.date)
        const expenseMonth = expenseDate.getUTCMonth() + 1
        const expenseYear = expenseDate.getUTCFullYear()
        
        return expenseMonth === monthNum && expenseYear === yearNum
      }).sort((a, b) => new Date(b.date) - new Date(a.date))
    },
    categoryExpenses() {
      if (!this.selectedCategoryForExpenses) return []
      
      const [year, month] = this.selectedMonth.split('-')
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      
      return this.expenses.filter(expense => {
        const expenseDate = new Date(expense.date)
        const expenseMonth = expenseDate.getUTCMonth() + 1
        const expenseYear = expenseDate.getUTCFullYear()
        
        const categoryMatches = String(expense.category._id) === String(this.selectedCategoryForExpenses._id)
        
        return expenseMonth === monthNum && expenseYear === yearNum && categoryMatches
      }).sort((a, b) => new Date(b.date) - new Date(a.date))
    }
  },

  methods: {
    async loadBudgets() {
      this.loading = true
      try {
        const res = await getBudgets()
        this.budgets = res.data
        if (this.budgets.length > 0) {
          this.selectedBudgetId = this.budgets[0]._id
          localStorage.setItem('budgetId', this.budgets[0]._id)
          await this.loadData()
        } else {
          this.loading = false
        }
      } catch (error) {
        console.error('Error loading budgets:', error)
        this.loading = false
      }
    },
    async loadData() {
      if (!this.selectedBudgetId) {
        this.loading = false
        return
      }
      
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
      } finally {
        this.loading = false
      }
    },
    handleMonthChange() {
      this.loadData()
    },
    async handleReorderCategories(categoryOrders) {
      if (!this.selectedBudgetId) return
      
      try {
        await reorderCategories(this.selectedBudgetId, categoryOrders)
        await this.loadData()
      } catch (error) {
        console.error('Error reordering categories:', error)
      }
    },
    async saveCategory() {
      if (!this.selectedBudgetId) return
      
      try {
        if (this.editingCategory) {
          await updateCategory(this.editingCategory._id, this.categoryForm)
        } else {
          // Set order to be after the last category
          const maxOrder = this.categories.length > 0 
            ? Math.max(...this.categories.map(c => c.order || 0))
            : -1
          await createCategory({ 
            ...this.categoryForm, 
            budgetId: this.selectedBudgetId,
            order: maxOrder + 1
          })
        }
        await this.loadData()
        this.closeCategoryModal()
      } catch (error) {
        console.error('Error saving category:', error)
      }
    },
    async saveCategoryAndCreateAnother() {
      if (!this.selectedBudgetId) return
      if (this.editingCategory) return
      
      if (!this.categoryForm.name) {
        return
      }
      
      try {
        // Set order to be after the last category
        const maxOrder = this.categories.length > 0 
          ? Math.max(...this.categories.map(c => c.order || 0))
          : -1
        await createCategory({ 
          ...this.categoryForm, 
          budgetId: this.selectedBudgetId,
          order: maxOrder + 1
        })
        await this.loadData()
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
    showCategoryExpenses(category) {
      this.selectedCategoryForExpenses = category
      this.showCategoryExpensesModal = true
    },
    closeCategoryExpensesModal() {
      this.showCategoryExpensesModal = false
      this.selectedCategoryForExpenses = null
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
      this.showAddExpenseModal = true
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
      if (this.editingExpense) return
      
      if (!this.expenseForm.description || !this.expenseForm.amount || !this.expenseForm.category || !this.expenseForm.date) {
        return
      }
      
      try {
        const data = {
          ...this.expenseForm,
          date: new Date(this.expenseForm.date),
          budgetId: this.selectedBudgetId
        }
        await createExpense(data)
        await this.loadData()
        this.expenseForm = {
          description: '',
          amount: 0,
          category: '',
          date: new Date().toISOString().split('T')[0]
        }
        this.selectedCategoryName = ''
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
      this.selectedCategoryName = ''
    },
    closeInviteUserModal() {
      this.showInviteUserModal = false
    },
    async syncTransactions() {
      if (!this.selectedBudgetId) {
        alert('Please select a budget first')
        return
      }
      this.syncing = true
      this.syncResult = null
      try {
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        const response = await syncTellerTransactions(this.selectedBudgetId, startDate, endDate)
        
        if (response.data.transactions && response.data.transactions.length > 0) {
          this.transactionsToCategorize = response.data.transactions.map(t => ({
            ...t,
            category: ''
          }))
          this.showCategorizeModal = true
          this.syncResult = {
            message: `Found ${response.data.transactions.length} transaction${response.data.transactions.length !== 1 ? 's' : ''} to categorize`
          }
        } else {
          this.syncResult = response.data
        }
      } catch (error) {
        console.error('Error syncing transactions:', error)
        alert(error.response?.data?.error || 'Failed to sync transactions. Please try again.')
      } finally {
        this.syncing = false
      }
    },
    closeCategorizeModal() {
      this.showCategorizeModal = false
      this.transactionsToCategorize = []
    },
    async importTransactions(categorizedTransactions) {
      if (!this.selectedBudgetId) return
      this.importing = true
      try {
        await createExpensesFromTransactions(this.selectedBudgetId, categorizedTransactions)
        this.closeCategorizeModal()
        await this.loadData() // Reload expenses and budget data
      } catch (error) {
        console.error('Error importing transactions:', error)
        alert(error.response?.data?.error || 'Failed to import transactions. Please try again.')
      } finally {
        this.importing = false
      }
    }
  },
  mounted() {
    this.loadBudgets()
  }
}
</script>

<style scoped>
.budget-view {
  max-width: 1000px;
  margin: 0 auto;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-state p {
  margin-top: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
