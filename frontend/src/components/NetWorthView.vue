<template>
  <div class="net-worth-view">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>
    <div v-else class="net-worth-content">
      <!-- Net Worth Header -->
      <div class="net-worth-header">
        <h1>Net Worth</h1>
        <div class="net-worth-amount" :class="{ positive: netWorth >= 0, negative: netWorth < 0 }">
          <span class="currency">$</span>
          <span class="amount">{{ formatCurrency(Math.abs(netWorth)) }}</span>
        </div>
        <p class="net-worth-subtitle">
          {{ netWorth >= 0 ? 'You\'re in the green!' : 'You\'re in the red' }}
        </p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card assets-card">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <h3>Total Assets</h3>
            <p class="card-amount positive">${{ formatCurrency(totalAssets) }}</p>
            <div class="card-breakdown">
              <span class="breakdown-item">
                <span class="breakdown-label">Bank Accounts:</span>
                <span class="breakdown-value">${{ formatCurrency(breakdown.tellerAssets) }}</span>
              </span>
              <span class="breakdown-item">
                <span class="breakdown-label">Manual Assets:</span>
                <span class="breakdown-value">${{ formatCurrency(breakdown.manualAssets) }}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="summary-card liabilities-card">
          <div class="card-icon">💳</div>
          <div class="card-content">
            <h3>Total Liabilities</h3>
            <p class="card-amount negative">${{ formatCurrency(totalLiabilities) }}</p>
            <div class="card-breakdown">
              <span class="breakdown-item">
                <span class="breakdown-label">Credit Cards:</span>
                <span class="breakdown-value">${{ formatCurrency(breakdown.tellerLiabilities) }}</span>
              </span>
              <span class="breakdown-item">
                <span class="breakdown-label">Manual Liabilities:</span>
                <span class="breakdown-value">${{ formatCurrency(breakdown.manualLiabilities) }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bank Accounts Section -->
      <div v-if="tellerAccounts.length > 0" class="accounts-section">
        <h2>Bank Accounts</h2>
        <div class="accounts-grid">
          <div
            v-for="account in tellerAccounts"
            :key="account.id"
            class="account-card"
            :class="account.type"
          >
            <div class="account-header">
              <div class="account-icon">
                {{ account.type === 'credit' ? '💳' : account.subtype === 'savings' ? '🏦' : '💵' }}
              </div>
              <div class="account-info">
                <h3>{{ account.name }}</h3>
                <p class="account-meta">
                  {{ account.institutionName }}
                  <span v-if="account.lastFour"> • •••• {{ account.lastFour }}</span>
                </p>
              </div>
            </div>
            <div class="account-balance" :class="{ positive: account.balance >= 0, negative: account.balance < 0 }">
              <span class="balance-label">{{ account.type === 'credit' ? 'Balance' : 'Balance' }}</span>
              <span class="balance-amount">
                {{ account.type === 'credit' ? '-' : '' }}${{ formatCurrency(Math.abs(account.balance)) }}
              </span>
            </div>
            <div class="account-type-badge">
              {{ account.subtype || account.type }}
            </div>
          </div>
        </div>
      </div>

      <!-- Manual Assets Section -->
      <div v-if="assets.length > 0" class="manual-section">
        <h2>Manual Assets</h2>
        <div class="manual-items">
          <div v-for="asset in assets" :key="asset._id" class="manual-item">
            <div class="item-name">{{ asset.name }}</div>
            <div class="item-amount positive">${{ formatCurrency(asset.value) }}</div>
          </div>
        </div>
      </div>

      <!-- Manual Liabilities Section -->
      <div v-if="liabilities.length > 0" class="manual-section">
        <h2>Manual Liabilities</h2>
        <div class="manual-items">
          <div v-for="liability in liabilities" :key="liability._id" class="manual-item">
            <div class="item-name">{{ liability.name }}</div>
            <div class="item-amount negative">${{ formatCurrency(liability.amount) }}</div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="tellerAccounts.length === 0 && assets.length === 0 && liabilities.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>No accounts connected</h3>
        <p>Connect your bank accounts to see your net worth</p>
      </div>
    </div>
  </div>
</template>

<script>
import { getNetWorth } from '../api/api'

export default {
  name: 'NetWorthView',
  data() {
    return {
      loading: true,
      netWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      assets: [],
      liabilities: [],
      tellerAccounts: [],
      breakdown: {
        manualAssets: 0,
        tellerAssets: 0,
        manualLiabilities: 0,
        tellerLiabilities: 0
      }
    }
  },
  mounted() {
    this.loadNetWorth()
  },
  methods: {
    async loadNetWorth() {
      this.loading = true
      try {
        const budgetId = localStorage.getItem('budgetId')
        if (!budgetId) {
          this.loading = false
          return
        }

        const response = await getNetWorth(budgetId)
        const data = response.data
        
        this.netWorth = data.netWorth || 0
        this.totalAssets = data.totalAssets || 0
        this.totalLiabilities = data.totalLiabilities || 0
        this.assets = data.assets || []
        this.liabilities = data.liabilities || []
        this.tellerAccounts = data.tellerAccounts || []
        this.breakdown = data.breakdown || {
          manualAssets: 0,
          tellerAssets: 0,
          manualLiabilities: 0,
          tellerLiabilities: 0
        }
      } catch (error) {
        console.error('Error loading net worth:', error)
      } finally {
        this.loading = false
      }
    },
    formatCurrency(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }
}
</script>

<style scoped>
.net-worth-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
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
  to { transform: rotate(360deg); }
}

.net-worth-header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  color: #111827;
}

.net-worth-header h1 {
  margin: 0 0 1rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
}

.net-worth-amount {
  font-size: 4rem;
  font-weight: 800;
  margin: 1rem 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
}

.net-worth-amount .currency {
  font-size: 2.5rem;
  opacity: 0.9;
}

.net-worth-amount.positive {
  color: #10b981;
}

.net-worth-amount.negative {
  color: #ef4444;
}

.net-worth-subtitle {
  margin: 0.5rem 0 0 0;
  font-size: 1.125rem;
  color: #6b7280;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-amount {
  font-size: 2rem;
  font-weight: 700;
  margin: 0.5rem 0;
}

.card-amount.positive {
  color: #10b981;
}

.card-amount.negative {
  color: #ef4444;
}

.card-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.breakdown-label {
  color: #6b7280;
}

.breakdown-value {
  font-weight: 600;
  color: #111827;
}

.accounts-section,
.manual-section {
  margin-bottom: 3rem;
}

.accounts-section h2,
.manual-section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1.5rem;
}

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.account-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}

.account-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.account-card.credit::before {
  background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
}

.account-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.account-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.account-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.account-info {
  flex: 1;
}

.account-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.account-meta {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.account-balance {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.balance-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.balance-amount {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
}

.balance-amount.positive {
  color: #10b981;
}

.balance-amount.negative {
  color: #ef4444;
}

.account-type-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: capitalize;
}

.manual-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.manual-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-name {
  font-weight: 500;
  color: #111827;
}

.item-amount {
  font-weight: 700;
  font-size: 1.125rem;
}

.item-amount.positive {
  color: #10b981;
}

.item-amount.negative {
  color: #ef4444;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #111827;
}

.empty-state p {
  margin: 0;
  color: #6b7280;
  font-size: 1rem;
}
</style>
