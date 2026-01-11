const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const User = require('../models/User');
const Invite = require('../models/Invite');
const { auth } = require('../middleware/auth');
const { sendInviteEmail } = require('../utils/email');
const crypto = require('crypto');

// Get all budgets for current user
router.get('/', auth, async (req, res) => {
  try {
    const budgets = await Budget.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 });

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single budget
router.get('/:id', auth, async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create budget
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const budget = new Budget({
      name: name || `${req.user.name}'s Budget`,
      owner: req.user._id
    });
    await budget.save();
    await budget.populate('owner', 'name email');
    res.status(201).json(budget);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Invite user to budget (by email - sends email with invite link)
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const budget = await Budget.findById(req.params.id)
      .populate('owner', 'name email');

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Check if user is owner or member
    const isOwner = budget.owner.toString() === req.user._id.toString();
    const isMember = budget.members.some(
      m => m.user && m.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Not authorized to invite users' });
    }

    // Check if user already exists and is a member
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const alreadyMember = budget.members.some(
        m => m.user && m.user.toString() === existingUser._id.toString()
      );
      if (alreadyMember) {
        return res.status(400).json({ error: 'This user is already a member of this budget' });
      }
    }

    // Check for existing pending invite
    const existingInvite = await Invite.findOne({
      email: email.toLowerCase(),
      budgetId: budget._id,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (existingInvite) {
      // Resend the existing invite
      try {
        await sendInviteEmail(email, existingInvite.token, budget.name);
        return res.json({ message: 'Invite email sent successfully' });
      } catch (emailError) {
        return res.status(500).json({ error: 'Failed to send invite email' });
      }
    }

    // Create new invite
    const token = crypto.randomBytes(32).toString('hex');
    const invite = new Invite({
      email: email.toLowerCase(),
      budgetId: budget._id,
      token
    });
    await invite.save();

    // Send invite email
    try {
      await sendInviteEmail(email, token, budget.name);
      res.json({ message: 'Invite email sent successfully' });
    } catch (emailError) {
      // If email fails, still save the invite but return error
      console.error('Failed to send invite email:', emailError);
      res.status(500).json({ error: 'Invite created but failed to send email. Please check email configuration.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get or generate invite code for budget
router.get('/:id/invite-code', auth, async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Check if user is owner or member
    const isOwner = budget.owner.toString() === req.user._id.toString();
    const isMember = budget.members.some(
      m => m.user && m.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Generate invite code if it doesn't exist
    if (!budget.inviteCode) {
      const crypto = require('crypto');
      budget.inviteCode = crypto.randomBytes(8).toString('hex');
      await budget.save();
    }

    res.json({ 
      inviteCode: budget.inviteCode,
      members: budget.members.map(m => ({
        _id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        role: m.role
      })),
      owner: {
        _id: budget.owner._id,
        name: budget.owner.name,
        email: budget.owner.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Regenerate invite code (invalidate old link)
router.post('/:id/regenerate-invite-code', auth, async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Only owner can regenerate
    if (budget.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only owner can regenerate invite code' });
    }

    // Generate new invite code
    const crypto = require('crypto');
    budget.inviteCode = crypto.randomBytes(8).toString('hex');
    await budget.save();

    res.json({ inviteCode: budget.inviteCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member from budget
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Only owner can remove members
    if (budget.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only owner can remove members' });
    }

    // Can't remove owner
    if (req.params.userId === budget.owner.toString()) {
      return res.status(400).json({ error: 'Cannot remove budget owner' });
    }

    budget.members = budget.members.filter(
      m => m.user && m.user.toString() !== req.params.userId
    );
    await budget.save();

    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
