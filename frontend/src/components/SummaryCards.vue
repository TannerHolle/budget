<template>
  <div class="grid grid-3 summary-grid">
    <div class="card summary-card">
      <h3>Total Budget</h3>
      <p class="amount">${{ totalBudget.toFixed(2) }}</p>
    </div>
    <div class="card summary-card">
      <h3>Total Actual</h3>
      <p class="amount amount-negative">${{ totalActual.toFixed(2) }}</p>
    </div>
    <div class="card summary-card">
      <h3>Remaining</h3>
      <p
        class="amount"
        :class="remaining >= 0 ? 'amount-positive' : 'amount-negative'"
      >
        ${{ remaining.toFixed(2) }}
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
  }
}
</script>

<style scoped>
.summary-card {
  text-align: center;
  padding: 1rem;
}

.summary-card h3 {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-card .amount {
  font-size: 1.5rem;
  font-weight: 700;
}

.summary-grid {
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
