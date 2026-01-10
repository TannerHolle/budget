const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['cash', 'investment', 'property', 'vehicle', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Asset', assetSchema);
