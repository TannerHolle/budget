<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>{{ editingCategory ? 'Edit' : 'Add' }} Category</h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Name</label>
          <input :value="localForm.name" @input="updateFormField('name', $event.target.value)" required />
        </div>
        <div class="form-group">
          <label>Budget (Expected Amount)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            :value="localForm.budget"
            @input="updateFormField('budget', parseFloat($event.target.value) || 0)"
          />
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" :checked="localForm.rollover" @change="updateFormField('rollover', $event.target.checked)" />
            <span>Rollover unused budget to next month</span>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="btn btn-secondary">
            Cancel
          </button>
          <button 
            v-if="!editingCategory" 
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
  name: 'CategoryModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    editingCategory: {
      type: Object,
      default: null
    },
    form: {
      type: Object,
      required: true
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
    }
  }
}
</script>

<style scoped>
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
  margin-bottom: 0;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
</style>
