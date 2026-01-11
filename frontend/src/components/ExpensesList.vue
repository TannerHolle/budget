<template>
  <div class="card">
    <h3>This Month's Expenses</h3>
    <div class="expenses-list">
      <div
        v-for="expense in expenses"
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
            <button @click.stop="toggleMenu(expense._id)" class="btn-menu" title="Menu">⋯</button>
            <div v-if="openMenu === expense._id" class="dropdown-menu">
              <button @click="handleEdit(expense); closeMenu()" class="dropdown-item">Edit</button>
              <button @click="handleDelete(expense); closeMenu()" class="dropdown-item delete">Delete</button>
            </div>
          </div>
        </div>
      </div>
      <p v-if="expenses.length === 0" class="empty-state">
        No expenses for {{ monthLabel || 'this month' }} yet.
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExpensesList',
  props: {
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

@media (max-width: 768px) {
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
