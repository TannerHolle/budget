<template>
  <div class="bank-connections-view">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>
    <PlaidConnection v-else :budget-id="selectedBudgetId" @connected="handleConnected" />
  </div>
</template>

<script>
import PlaidConnection from './PlaidConnection.vue'
import { getBudgets } from '../api/api'

export default {
  name: 'BankConnectionsView',
  components: {
    PlaidConnection
  },
  data() {
    return {
      budgets: [],
      selectedBudgetId: localStorage.getItem('budgetId') || null,
      loading: true
    }
  },
  mounted() {
    this.loadBudgets()
  },
  methods: {
    async loadBudgets() {
      this.loading = true
      try {
        const res = await getBudgets()
        this.budgets = res.data
        if (this.budgets.length > 0) {
          // Use stored budgetId or default to first budget
          const storedBudgetId = localStorage.getItem('budgetId')
          const budgetExists = this.budgets.some(b => b._id === storedBudgetId)
          this.selectedBudgetId = budgetExists ? storedBudgetId : this.budgets[0]._id
          localStorage.setItem('budgetId', this.selectedBudgetId)
        }
      } catch (error) {
        console.error('Error loading budgets:', error)
      } finally {
        this.loading = false
      }
    },
    handleConnected() {
      // Reload accounts after connection
    }
  }
}
</script>

<style scoped>
.bank-connections-view {
  max-width: 1000px;
  margin: 0 auto;
}

.bank-connections-view h2 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
  color: #111827;
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
