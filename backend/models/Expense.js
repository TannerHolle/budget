const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  budgetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Budget',
    required: true
  },
  tellerTransactionId: {
    type: String,
    sparse: true,
    unique: true
  },
  accountName: {
    type: String,
    sparse: true
  },
  institutionName: {
    type: String,
    sparse: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
