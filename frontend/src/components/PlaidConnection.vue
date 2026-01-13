<template>
  <div class="plaid-connection">
    <div class="card">
      <div class="card-header">
        <h3>Bank Connections</h3>
        <button 
          v-if="accounts.length > 0"
          @click="openPlaidLink" 
          class="btn btn-secondary btn-small" 
          :disabled="loading"
        >
          {{ loading ? 'Loading...' : 'Add Another Account' }}
        </button>
      </div>
      <div v-if="accounts.length === 0" class="no-connections">
        <p>No bank accounts connected</p>
        <button @click="openPlaidLink" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Loading...' : 'Connect Bank Account' }}
        </button>
      </div>
      <div v-else>
        <div v-for="account in accounts" :key="account.account_id" class="account-item">
          <div class="account-info">
            <strong>{{ account.name }}</strong>
            <span class="account-type">{{ account.type }} • {{ account.subtype }}</span>
            <span class="institution">{{ account.institutionName }}</span>
          </div>
          <div class="account-actions">
            <div class="account-balance">
              ${{ formatCurrency(account.balance.current || 0) }}
            </div>
            <button
              @click="removeAccount(account.itemId, account.institutionName)"
              class="btn-remove-account"
              title="Remove bank connection"
              :disabled="removingAccount === account.itemId"
            >
              {{ removingAccount === account.itemId ? '...' : '×' }}
            </button>
          </div>
        </div>
        <div class="sync-section">
          <button @click="syncTransactions" class="btn btn-primary" :disabled="syncing">
            {{ syncing ? 'Syncing...' : 'Sync Transactions' }}
          </button>
          <p v-if="syncResult" class="sync-result" :class="{ 'success': syncResult.imported > 0, 'info': syncResult.imported === 0 }">
            {{ syncResult.message }}
          </p>
        </div>
      </div>
    </div>

    <!-- Categorize Transactions Modal -->
    <CategorizeTransactionsModal
      :show="showCategorizeModal"
      :transactions="transactionsToCategorize"
      :categories="categories"
      :importing="importing"
      @close="closeCategorizeModal"
      @import="importTransactions"
    />
  </div>
</template>

<script>
import { createLinkToken, exchangePublicToken, getPlaidAccounts, removePlaidConnection, syncPlaidTransactions, createExpensesFromTransactions, getCategories } from '../api/api'
import CategorizeTransactionsModal from './CategorizeTransactionsModal.vue'

export default {
  name: 'PlaidConnection',
  components: {
    CategorizeTransactionsModal
  },
  props: {
    budgetId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      accounts: [],
      transactionsToCategorize: [],
      categories: [],
      loading: false,
      syncing: false,
      importing: false,
      removingAccount: null,
      syncResult: null,
      showCategorizeModal: false,
      linkHandler: null
    }
  },
  watch: {
    budgetId() {
      this.loadAccounts()
      this.loadCategories()
    }
  },
  mounted() {
    this.loadAccounts()
    this.loadCategories()
    this.loadPlaidScript()
  },
  beforeUnmount() {
    if (this.linkHandler) {
      this.linkHandler.destroy()
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
    async loadAccounts() {
      if (!this.budgetId) return
      try {
        const response = await getPlaidAccounts(this.budgetId)
        this.accounts = response.data.accounts || []
      } catch (error) {
        console.error('Error loading accounts:', error)
      }
    },
    async loadCategories() {
      if (!this.budgetId) return
      try {
        const response = await getCategories(this.budgetId)
        this.categories = response.data || []
      } catch (error) {
        console.error('Error loading categories:', error)
      }
    },
    loadPlaidScript() {
      // Load Plaid Link script dynamically
      if (document.getElementById('plaid-link-script')) {
        return
      }

      const script = document.createElement('script')
      script.id = 'plaid-link-script'
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
      script.onload = () => {
        // Script loaded, ready to use
      }
      document.head.appendChild(script)
    },
    async openPlaidLink() {
      if (!this.budgetId) {
        alert('Please select a budget first')
        return
      }
      this.loading = true
      try {
        const response = await createLinkToken(this.budgetId)
        const linkToken = response.data.link_token

        // Wait for Plaid script to be available
        if (typeof window.Plaid === 'undefined') {
          await new Promise((resolve) => {
            const checkPlaid = setInterval(() => {
              if (typeof window.Plaid !== 'undefined') {
                clearInterval(checkPlaid)
                resolve()
              }
            }, 100)
          })
        }

        const handler = window.Plaid.create({
          token: linkToken,
          onSuccess: async (publicToken, metadata) => {
            try {
              await exchangePublicToken(publicToken, metadata, this.budgetId)
              await this.loadAccounts()
              this.loading = false
              this.$emit('connected')
            } catch (error) {
              console.error('Error exchanging token:', error)
              this.loading = false
              alert('Failed to connect account. Please try again.')
            }
          },
          onExit: (err, metadata) => {
            if (err) {
              console.error('Plaid Link error:', err)
            }
            this.loading = false
          },
          onEvent: (eventName, metadata) => {
            console.log('Plaid event:', eventName, metadata)
          }
        })

        this.linkHandler = handler
        handler.open()
      } catch (error) {
        console.error('Error creating link token:', error)
        alert('Failed to initialize bank connection. Please try again.')
        this.loading = false
      }
    },
    async syncTransactions() {
      if (!this.budgetId) {
        alert('Please select a budget first')
        return
      }
      this.syncing = true
      this.syncResult = null
      try {
        // Sync last 30 days of transactions
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        console.log('Syncing transactions:', { budgetId: this.budgetId, startDate, endDate })
        
        const response = await syncPlaidTransactions(this.budgetId, startDate, endDate)
        console.log('Sync response:', response.data)
        
        if (response.data.transactions && response.data.transactions.length > 0) {
          // Show modal to categorize transactions
          this.transactionsToCategorize = response.data.transactions.map(t => ({
            ...t,
            category: '' // No category assigned yet
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
      if (!this.budgetId) return
      this.importing = true
      try {
        await createExpensesFromTransactions(this.budgetId, categorizedTransactions)
        this.closeCategorizeModal()
        this.syncResult = {
          message: `Successfully imported ${categorizedTransactions.length} transaction${categorizedTransactions.length !== 1 ? 's' : ''}`
        }
        this.$emit('connected') // Emit to refresh expenses
      } catch (error) {
        console.error('Error importing transactions:', error)
        alert(error.response?.data?.error || 'Failed to import transactions. Please try again.')
      } finally {
        this.importing = false
      }
    },
    async removeAccount(itemId, institutionName) {
      if (!this.budgetId || !itemId) return
      
      // Count how many accounts will be removed
      const accountsToRemove = this.accounts.filter(acc => acc.itemId === itemId)
      const accountCount = accountsToRemove.length
      const accountNames = accountsToRemove.map(acc => acc.name).join(', ')
      
      const message = accountCount > 1
        ? `Remove ${institutionName} connection?\n\nThis will remove ALL ${accountCount} accounts from ${institutionName}:\n${accountNames}\n\nThis will stop syncing transactions from all these accounts. You can reconnect them later if needed.`
        : `Remove ${institutionName} connection?\n\nThis will remove the "${accountNames}" account and stop syncing transactions from it. You can reconnect it later if needed.`
      
      if (!confirm(message)) {
        return
      }
      
      this.removingAccount = itemId
      try {
        await removePlaidConnection(itemId, this.budgetId)
        await this.loadAccounts()
        this.$emit('connected') // Emit to refresh
      } catch (error) {
        console.error('Error removing connection:', error)
        alert(error.response?.data?.error || 'Failed to remove connection. Please try again.')
      } finally {
        this.removingAccount = null
      }
    }
  }
}
</script>

<style scoped>
.plaid-connection {
  margin-bottom: 0.75rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.plaid-connection h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.no-connections {
  text-align: center;
  padding: 1rem 0;
}

.no-connections p {
  margin-bottom: 0.75rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.account-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.account-info strong {
  font-size: 0.875rem;
  color: #111827;
}

.account-type {
  font-size: 0.75rem;
  color: #6b7280;
}

.institution {
  font-size: 0.75rem;
  color: #9ca3af;
}

.account-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.account-balance {
  font-weight: 700;
  font-size: 0.9375rem;
  color: #059669;
}

.btn-remove-account {
  width: 28px;
  height: 28px;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 4px;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
  padding: 0;
}

.btn-remove-account:hover:not(:disabled) {
  background: #fecaca;
}

.btn-remove-account:active:not(:disabled) {
  background: #fca5a5;
}

.btn-remove-account:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sync-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.sync-result {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.sync-result.success {
  background: #d1fae5;
  color: #065f46;
}

.sync-result.info {
  background: #e0e7ff;
  color: #3730a3;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}
</style>
