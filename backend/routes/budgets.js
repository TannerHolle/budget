const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

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

// Invite user to budget (by email)
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const budget = await Budget.findById(req.params.id);

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

    // Find user by email
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a member
    const alreadyMember = budget.members.some(
      m => m.user && m.user.toString() === userToInvite._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add user to members
    budget.members.push({
      user: userToInvite._id,
      role: 'member'
    });
    await budget.save();

    await budget.populate('members.user', 'name email');
    res.json(budget);
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
