<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>{{ editingExpense ? 'Edit' : 'Add' }} Expense</h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Date</label>
          <input
            type="date"
            :value="localForm.date"
            @input="updateFormField('date', $event.target.value)"
            required
          />
        </div>
        <div class="form-group">
          <label>Category</label>
          <div class="searchable-select">
            <input
              type="text"
              :value="selectedCategoryName || categorySearch"
              @input="handleCategoryInput"
              @focus="showCategoryDropdown = true; if (selectedCategoryName) { categorySearch = ''; }; highlightedCategoryIndex = -1"
              @keydown="handleCategoryKeydown"
              :placeholder="selectedCategoryName ? '' : 'Search or select a category'"
              class="select-input"
            />
            <input type="hidden" :value="localForm.category" required />
            <div v-if="showCategoryDropdown" class="select-dropdown">
              <div
                v-for="(cat, index) in filteredCategories"
                :key="cat._id"
                @click="selectCategory(cat._id, cat.name)"
                class="select-option"
                :class="{ 
                  'selected': localForm.category === cat._id,
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
          <input :value="localForm.description" @input="updateFormField('description', $event.target.value)" required />
        </div>
        <div class="form-group">
          <label>Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            :value="localForm.amount"
            @input="updateFormField('amount', parseFloat($event.target.value) || 0)"
            required
          />
        </div>
        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="btn btn-secondary">
            Cancel
          </button>
          <button 
            v-if="!editingExpense" 
            type="button" 
            @click="handleSaveAndCreateAnother" 
            class="btn btn-primary"
          >
            Save and Create Another
          </button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExpenseModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    editingExpense: {
      type: Object,
      default: null
    },
    form: {
      type: Object,
      required: true
    },
    categories: {
      type: Array,
      required: true
    },
    selectedCategoryName: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      categorySearch: '',
      showCategoryDropdown: false,
      highlightedCategoryIndex: -1
    }
  },
  computed: {
    localForm: {
      get() {
        return this.form
      },
      set(value) {
        this.$emit('update:form', value)
      }
    },
    filteredCategories() {
      if (!this.categorySearch) {
        return this.categories
      }
      const search = this.categorySearch.toLowerCase()
      return this.categories.filter(cat => 
        cat.name.toLowerCase().includes(search)
      )
    }
  },
  watch: {
    show(newVal) {
      if (!newVal) {
        // Reset dropdown state when modal closes
        this.categorySearch = ''
        this.showCategoryDropdown = false
        this.highlightedCategoryIndex = -1
      }
    },
    selectedCategoryName(newVal) {
      if (newVal) {
        this.categorySearch = ''
      }
    }
  },
  methods: {
    updateFormField(field, value) {
      this.$emit('update:form', { ...this.localForm, [field]: value })
    },
    handleSubmit() {
      this.$emit('save')
    },
    handleSaveAndCreateAnother() {
      this.$emit('save-and-create-another')
    },
    handleCategoryInput(event) {
      this.categorySearch = event.target.value
      if (this.selectedCategoryName) {
        this.$emit('update:selectedCategoryName', '')
        this.updateFormField('category', '')
      }
      this.showCategoryDropdown = true
      this.highlightedCategoryIndex = -1
    },
    selectCategory(categoryId, categoryName) {
      this.updateFormField('category', categoryId)
      this.$emit('update:selectedCategoryName', categoryName)
      this.categorySearch = ''
      this.showCategoryDropdown = false
      this.highlightedCategoryIndex = -1
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
        this.$nextTick(() => {
          const element = document.getElementById(`category-option-${this.highlightedCategoryIndex}`)
          if (element) {
            element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        })
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        this.highlightedCategoryIndex = Math.max(this.highlightedCategoryIndex - 1, -1)
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
          const cat = this.filteredCategories[0]
          this.selectCategory(cat._id, cat.name)
        }
      } else if (event.key === 'Escape') {
        event.preventDefault()
        this.showCategoryDropdown = false
        this.highlightedCategoryIndex = -1
      }
    },
    handleClickOutside(event) {
      if (!event.target.closest('.searchable-select')) {
        this.showCategoryDropdown = false
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

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
</style>
