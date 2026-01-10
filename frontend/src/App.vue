<template>
  <div id="app">
    <nav class="navbar">
      <div class="container">
        <h1 class="logo">Budget Tracker</h1>
      </div>
    </nav>
    <main class="main-content">
      <div class="container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style scoped>
.navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 1rem 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar .container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  color: #667eea;
  margin: 0;
}

.main-content {
  padding: 2rem 0;
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem 0;
  }
}
</style>
