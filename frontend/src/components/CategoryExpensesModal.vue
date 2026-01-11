<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>{{ category?.name }} Expenses</h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      <div class="category-expenses-list">
        <div
          v-for="expense in expenses"
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
              <button @click.stop="toggleMenu(expense._id)" class="btn-menu" title="Menu">⋯</button>
              <div v-if="openMenu === expense._id" class="dropdown-menu">
                <button @click="handleEdit(expense); closeMenu()" class="dropdown-item">Edit</button>
                <button @click="handleDelete(expense); closeMenu()" class="dropdown-item delete">Delete</button>
              </div>
            </div>
          </div>
        </div>
        <p v-if="expenses.length === 0" class="empty-state">
          No expenses in this category for {{ monthLabel || 'this month' }}.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CategoryExpensesModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    category: {
      type: Object,
      default: null
    },
    expenses: {
      type: Array,
      required: true
    },
    hasMultipleUsers: {
      type: Boolean,
      default: false
    },
    monthLabel: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      openMenu: null
    }
  },
  methods: {
    formatDate(date) {
      const d = new Date(date)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
    },
    toggleMenu(expenseId) {
      this.openMenu = this.openMenu === expenseId ? null : expenseId
    },
    closeMenu() {
      this.openMenu = null
    },
    handleEdit(expense) {
      this.$emit('edit-expense', expense)
    },
    handleDelete(expense) {
      this.$emit('delete-expense', expense)
    },
    handleClickOutside(event) {
      if (!event.target.closest('.menu-container')) {
        this.openMenu = null
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  }
}
</script>

<style scoped>
.category-expenses-list {
  max-height: 60vh;
  overflow-y: auto;
  margin-top: 0.75rem;
}

.category-expenses-list .expense-item {
  margin-bottom: 0.5rem;
}

.expense-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
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
  margin-bottom: 0.125rem;
  font-size: 0.875rem;
}

.expense-meta {
  font-size: 0.75rem;
  color: #6b7280;
}

.expense-creator {
  color: #475569;
  font-weight: 500;
}

.expense-amount {
  font-weight: 700;
  font-size: 0.9375rem;
  color: #ef4444;
}

.empty-state {
  text-align: center;
  color: #6b7280;
  padding: 1.5rem;
  font-size: 0.875rem;
}

.menu-container {
  position: relative;
  display: inline-block;
}

.btn-menu {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  line-height: 1;
  width: 24px;
  height: 24px;
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
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 100px;
  z-index: 10;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8125rem;
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
</style>
