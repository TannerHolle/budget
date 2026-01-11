<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Invite someone to your budget</h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Email address</label>
          <input 
            type="email" 
            v-model="email" 
            placeholder="Enter their email address"
            required 
            :disabled="loading"
          />
          <p class="help-text">
            We'll send them an email with a link to create an account and join your budget. Only they can use this invite.
          </p>
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        <div v-if="success" class="success-message">
          {{ success }}
        </div>
        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send Invite' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InviteUserModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    budgetId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      email: '',
      error: '',
      success: '',
      loading: false
    }
  },
  watch: {
    show(newVal) {
      if (!newVal) {
        // Reset when modal closes
        this.email = ''
        this.error = ''
        this.success = ''
        this.loading = false
      }
    }
  },
  methods: {
    async handleSubmit() {
      if (!this.email) return
      
      this.error = ''
      this.success = ''
      this.loading = true
      
      try {
        const { inviteToBudget } = await import('../api/api')
        await inviteToBudget(this.budgetId, this.email)
        this.success = `Invite sent to ${this.email}! They'll receive an email with instructions to join.`
        this.email = ''
        setTimeout(() => {
          this.success = ''
        }, 5000)
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to send invite'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.help-text {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.5rem;
  margin-bottom: 0;
  line-height: 1.4;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.success-message {
  background: #dcfce7;
  color: #059669;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
