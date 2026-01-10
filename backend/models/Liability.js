const mongoose = require('mongoose');

const liabilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['credit_card', 'loan', 'mortgage', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Liability', liabilitySchema);
