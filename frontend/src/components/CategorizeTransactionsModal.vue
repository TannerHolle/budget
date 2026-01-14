<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal categorize-modal">
      <div class="modal-header">
        <h2>Categorize Transactions</h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      <div class="modal-content">
        <p class="info-text">
          Please assign a category to each transaction before importing.
        </p>
        <div class="transactions-list">
          <div
            v-for="(transaction, index) in transactions"
            :key="transaction.transaction_id"
            class="transaction-row"
          >
            <div class="transaction-details">
              <div class="transaction-name">
                {{ transaction.merchant_name || transaction.name }}
              </div>
              <div class="transaction-meta">
                <span class="transaction-date">{{ formatDate(transaction.date) }}</span>
                <span class="transaction-amount">${{ formatCurrency(transaction.amount) }}</span>
              </div>
              <div class="transaction-account">
                <small>{{ transaction.accountName }} • {{ transaction.institutionName }}</small>
              </div>
              <div v-if="transaction.tellerCategory && transaction.tellerCategory.length > 0" class="teller-category">
                <small>Teller: {{ transaction.tellerCategory.join(' > ') }}</small>
              </div>
            </div>
            <div class="transaction-actions">
              <select
                v-model="transaction.category"
                class="category-select"
                required
              >
                <option value="">Select category...</option>
                <option
                  v-for="category in categories"
                  :key="category._id"
                  :value="category._id"
                >
                  {{ category.name }}
                </option>
              </select>
              <button
                @click="removeTransaction(index)"
                class="delete-btn"
                type="button"
                title="Remove transaction"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" @click="$emit('close')" class="btn btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          @click="handleImport"
          class="btn btn-primary"
          :disabled="!canImport || importing"
        >
          {{ importing ? 'Importing...' : `Import ${validTransactionsCount} Transaction${validTransactionsCount !== 1 ? 's' : ''}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CategorizeTransactionsModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    transactions: {
      type: Array,
      required: true
    },
    categories: {
      type: Array,
      required: true
    },
    importing: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'import'],
  computed: {
    validTransactionsCount() {
      return this.transactions.filter(t => t.category).length
    },
    canImport() {
      return this.validTransactionsCount > 0
    }
  },
  methods: {
    formatCurrency(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    },
    handleImport() {
      const categorized = this.transactions.filter(t => t.category)
      this.$emit('import', categorized)
    },
    removeTransaction(index) {
      this.transactions.splice(index, 1)
    }
  }
}
</script>

<style scoped>
.categorize-modal {
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.info-text {
  margin-bottom: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.transaction-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.transaction-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.transaction-name {
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;
}

.transaction-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.transaction-amount {
  font-weight: 600;
  color: #dc2626;
}

.transaction-account {
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.7rem;
}

.teller-category {
  margin-top: 0.25rem;
  color: #9ca3af;
  font-size: 0.7rem;
}

.transaction-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-select {
  min-width: 200px;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

.delete-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 4px;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: #fecaca;
}

.delete-btn:active {
  background: #fca5a5;
}

.category-select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.modal-actions {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
