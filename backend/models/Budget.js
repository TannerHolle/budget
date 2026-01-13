const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'My Budget'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  plaidAccessTokens: [{
    itemId: String,
    accessToken: String,
    institutionId: String,
    institutionName: String
  }]
}, {
  timestamps: true
});

// Ensure owner is in members array
budgetSchema.pre('save', function(next) {
  const ownerInMembers = this.members.some(
    member => member.user && member.user.toString() === this.owner.toString()
  );
  
  if (!ownerInMembers) {
    this.members.unshift({
      user: this.owner,
      role: 'owner',
      addedAt: this.createdAt || new Date()
    });
  }
  
  next();
});

module.exports = mongoose.model('Budget', budgetSchema);
