<template>
  <div class="card">
    <div class="budget-card-header">
      <select v-if="months.length > 1" v-model="localSelectedMonth" @change="handleMonthChange" class="month-select">
        <option v-for="month in months" :key="month.value" :value="month.value">
          {{ month.label }}
        </option>
      </select>
      <span v-else class="month-display">{{ months[0]?.label || 'No months available' }}</span>
      <div class="budget-card-actions">
        <div class="settings-container">
          <button @click.stop="toggleSettingsMenu" class="btn-menu" title="Settings">⋯</button>
          <div v-if="showSettingsMenu" class="settings-dropdown">
            <button @click="handleAddCategory" class="dropdown-item">Add Category</button>
            <button @click="handleToggleReorder" class="dropdown-item">Reorder Categories</button>
            <button @click="handleInviteUser" class="dropdown-item">Invite User</button>
          </div>
        </div>
        <button @click="$emit('add-expense')" class="btn btn-primary">
          + Add Expense
        </button>
        <button v-if="reorderMode" @click="exitReorderMode" class="btn btn-secondary btn-sm">
          Done Reordering
        </button>
      </div>
    </div>
    <table class="budget-table">
      <thead>
        <tr>
          <th v-if="reorderMode" style="width: 30px;"></th>
          <th>Category</th>
          <th>Amount</th>
          <th>Budget %</th>
          <th>Actual</th>
          <th>Actual %</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in budgetData"
          :key="item.category._id"
          :class="{ 
            'over-budget': item.actual > item.budget && item.budget > 0, 
            'clickable-row': !reorderMode, 
            'dragging': draggedIndex === index,
            'drag-over': dragOverIndex === index
          }"
          :draggable="reorderMode"
          @dragstart="handleDragStart(index, $event)"
          @dragover.prevent="handleDragOver($event)"
          @dragenter.prevent="handleDragEnter(index, $event)"
          @dragleave="handleDragLeave(index, $event)"
          @drop="handleDrop(index, $event)"
          @dragend="handleDragEnd"
          @click="!isDragging && !reorderMode && $emit('show-category-expenses', item.category)"
        >
          <td v-if="reorderMode" class="drag-handle" @click.stop @mousedown.stop>
            <span class="grip-icon">⋮⋮</span>
          </td>
          <td>
            <span class="category-name">{{ item.category.name }}</span>
            <span v-if="item.category.rollover" class="rollover-badge" title="Rollover enabled">↻</span>
          </td>
          <td>
            <span v-if="item.budget > 0">${{ formatCurrency(item.budget) }}</span>
            <span v-else class="empty-value">-</span>
          </td>
          <td>
            <span v-if="totalBudget > 0">
              {{ ((item.budget / totalBudget) * 100).toFixed(1) }}%
            </span>
            <span v-else class="empty-value">-</span>
          </td>
          <td>
            <span v-if="item.actual > 0" class="actual-value">${{ formatCurrency(item.actual) }}</span>
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
              <button @click.stop="toggleMenu(item.category._id)" class="btn-menu" title="Menu">⋯</button>
              <div v-if="openMenu === item.category._id" class="dropdown-menu">
                <button @click="handleEdit(item.category); closeMenu()" class="dropdown-item">Edit</button>
                <button @click="handleDelete(item.category); closeMenu()" class="dropdown-item delete">Delete</button>
              </div>
            </div>
          </td>
        </tr>
        <tr class="total-row">
          <td v-if="reorderMode"></td>
          <td><strong>Total</strong></td>
          <td><strong>${{ formatCurrency(totalBudget) }}</strong></td>
          <td><strong v-if="totalBudget > 0">100.0%</strong><strong v-else>-</strong></td>
          <td>
            <strong v-if="totalActual > 0" class="actual-value">${{ formatCurrency(totalActual) }}</strong>
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
</template>

<script>
export default {
  name: 'BudgetTable',
  props: {
    budgetData: {
      type: Array,
      required: true
    },
    totalBudget: {
      type: Number,
      required: true
    },
    totalActual: {
      type: Number,
      required: true
    },
    months: {
      type: Array,
      required: true
    },
    selectedMonth: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      openMenu: null,
      draggedIndex: null,
      dragOverIndex: null,
      isDragging: false,
      showSettingsMenu: false,
      reorderMode: false
    }
  },
  computed: {
    localSelectedMonth: {
      get() {
        return this.selectedMonth
      },
      set(value) {
        this.$emit('update:selectedMonth', value)
      }
    }
  },
  methods: {
    formatCurrency(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    toggleMenu(categoryId) {
      this.openMenu = this.openMenu === categoryId ? null : categoryId
    },
    closeMenu() {
      this.openMenu = null
    },
    handleEdit(category) {
      this.$emit('edit-category', category)
    },
    handleDelete(category) {
      this.$emit('delete-category', category)
    },
    handleMonthChange() {
      this.$emit('month-changed', this.localSelectedMonth)
    },
    handleClickOutside(event) {
      if (!event.target.closest('.menu-container')) {
        this.openMenu = null
      }
      if (!event.target.closest('.settings-container')) {
        this.showSettingsMenu = false
      }
    },
    toggleSettingsMenu() {
      this.showSettingsMenu = !this.showSettingsMenu
    },
    handleAddCategory() {
      this.showSettingsMenu = false
      this.$emit('add-category')
    },
    handleToggleReorder() {
      this.showSettingsMenu = false
      this.reorderMode = !this.reorderMode
      if (!this.reorderMode) {
        // Exit reorder mode - reset drag state
        this.draggedIndex = null
        this.dragOverIndex = null
        this.isDragging = false
      }
    },
    handleInviteUser() {
      this.showSettingsMenu = false
      this.$emit('invite-user')
    },
    exitReorderMode() {
      this.reorderMode = false
      this.draggedIndex = null
      this.dragOverIndex = null
      this.isDragging = false
    },
    handleDragStart(index, event) {
      this.draggedIndex = index
      this.isDragging = true
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/html', event.target)
      // Only make the row itself semi-transparent, not the entire row
      const row = event.currentTarget
      row.style.opacity = '0.5'
    },
    handleDragOver(event) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    },
    handleDragEnter(index, event) {
      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        this.dragOverIndex = index
      }
    },
    handleDragLeave(index, event) {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.dragOverIndex = null
      }
    },
    handleDrop(index, event) {
      event.preventDefault()
      if (this.draggedIndex === null || this.draggedIndex === index) {
        return
      }

      const newBudgetData = [...this.budgetData]
      const draggedItem = newBudgetData[this.draggedIndex]
      newBudgetData.splice(this.draggedIndex, 1)
      newBudgetData.splice(index, 0, draggedItem)

      this.$emit('reorder-categories', newBudgetData.map((item, idx) => ({
        categoryId: item.category._id,
        order: idx
      })))
    },
    handleDragEnd(event) {
      const row = event.currentTarget
      row.style.opacity = ''
      this.draggedIndex = null
      this.dragOverIndex = null
      this.isDragging = false
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
.month-select {
  padding: 0.25rem 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.75rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.month-display {
  padding: 0.25rem 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.75rem;
  background: white;
  color: #374151;
  display: inline-block;
}

.month-select:focus {
  outline: none;
  border-color: #475569;
}

.budget-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.budget-card-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.budget-card-actions .btn {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
}

.budget-card-actions .btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
}

.settings-container {
  position: relative;
  display: inline-block;
}

.settings-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  z-index: 10;
  overflow: hidden;
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
  padding: 0.375rem 0.5rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.6875rem;
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

.budget-table tbody tr.dragging {
  opacity: 0.5;
}

.budget-table tbody tr.drag-over {
  border-top: 2px solid #475569;
}

.budget-table tbody tr[draggable="true"] {
  cursor: move;
}

.drag-handle {
  cursor: grab;
  user-select: none;
  text-align: center;
  width: 30px;
  padding: 0.375rem 0.25rem;
}

.drag-handle:active {
  cursor: grabbing;
}

.grip-icon {
  color: #9ca3af;
  font-size: 0.875rem;
  line-height: 1;
  display: inline-block;
  letter-spacing: -0.1em;
}

.grip-icon:hover {
  color: #6b7280;
}

.budget-table tbody tr.over-budget {
  background: #fef2f2;
}

.budget-table tbody tr.over-budget:nth-child(even) {
  background: #fee2e2;
}

.budget-table td {
  padding: 0.375rem 0.5rem;
  vertical-align: middle;
  font-size: 0.8125rem;
}

.category-name {
  font-weight: 600;
  color: #111827;
  font-size: 0.8125rem;
}

.rollover-badge {
  margin-left: 0.25rem;
  color: #475569;
  font-size: 0.6875rem;
  font-weight: 600;
}

.rollover-legend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
  font-size: 0.6875rem;
  color: #6b7280;
}

.rollover-legend .rollover-badge {
  margin-left: 0;
  font-size: 0.875rem;
}

.legend-text {
  color: #6b7280;
}

.empty-value {
  color: #9ca3af;
}

.actual-value {
  background: #dcfce7;
  color: #059669;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-weight: 600;
  font-size: 0.75rem;
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
  padding: 0.375rem 0.5rem;
  font-weight: 700;
  font-size: 0.8125rem;
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
  
  .budget-table {
    font-size: 0.875rem;
  }
  
  .budget-table th,
  .budget-table td {
    padding: 0.75rem 0.5rem;
  }
}
</style>
