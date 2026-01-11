<template>
  <div class="grid grid-3 summary-grid">
    <div class="card summary-card">
      <h3>Total Budget</h3>
      <p class="amount">${{ formatCurrency(totalBudget) }}</p>
    </div>
    <div class="card summary-card">
      <h3>Total Actual</h3>
      <p class="amount amount-negative">${{ formatCurrency(totalActual) }}</p>
    </div>
    <div class="card summary-card">
      <h3>Remaining</h3>
      <p
        class="amount"
        :class="remaining >= 0 ? 'amount-positive' : 'amount-negative'"
      >
        ${{ formatCurrency(remaining) }}
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SummaryCards',
  props: {
    totalBudget: {
      type: Number,
      required: true
    },
    totalActual: {
      type: Number,
      required: true
    },
    remaining: {
      type: Number,
      required: true
    }
  },
  methods: {
    formatCurrency(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }
}
</script>

<style scoped>
.summary-card {
  text-align: center;
  padding: 0.75rem;
}

.summary-card h3 {
  font-size: 0.625rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-card .amount {
  font-size: 1.125rem;
  font-weight: 700;
}

.summary-grid {
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

@media (max-width: 768px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
