<template>
  <div class="net-worth-view">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>
    <div v-else class="card">
      <h2>Net Worth</h2>
      <p>Coming soon...</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NetWorthView',
  data() {
    return {
      loading: true
    }
  },
  mounted() {
    // Simulate loading for placeholder page
    setTimeout(() => {
      this.loading = false
    }, 500)
  }
}
</script>

<style scoped>
.net-worth-view {
  max-width: 1000px;
  margin: 0 auto;
}

.net-worth-view h2 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
  color: #111827;
}

.net-worth-view p {
  color: #6b7280;
  font-size: 0.875rem;
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
