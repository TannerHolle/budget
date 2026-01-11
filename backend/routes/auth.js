const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Budget = require('../models/Budget');
const { JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, inviteCode } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = new User({ email, password, name });
    await user.save();

    let budget;
    let budgetId;

    // If invite token provided, add user to that budget
    if (inviteCode) {
      const Invite = require('../models/Invite');
      const invite = await Invite.findOne({ 
        token: inviteCode,
        used: false,
        expiresAt: { $gt: new Date() }
      }).populate('budgetId');

      if (!invite) {
        return res.status(400).json({ error: 'Invalid or expired invite link' });
      }

      // Verify email matches
      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ error: 'This invite was sent to a different email address' });
      }

      budget = invite.budgetId;
      
      // Check if user is already a member
      const alreadyMember = budget.members.some(
        m => m.user && m.user.toString() === user._id.toString()
      );
      if (alreadyMember) {
        // Mark invite as used even though already member
        invite.used = true;
        await invite.save();
        budgetId = budget._id;
      } else {
        // Add user to budget
        budget.members.push({
          user: user._id,
          role: 'member'
        });
        await budget.save();
        
        // Mark invite as used
        invite.used = true;
        await invite.save();
        budgetId = budget._id;
      }
    } else {
      // Create default budget for user
      budget = new Budget({
        name: `${name}'s Budget`,
        owner: user._id
      });
      await budget.save();
      budgetId = budget._id;
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      },
      budgetId: budgetId
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token with longer expiration if "Remember Me" is checked
    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn });

    // Get user's primary budget (first budget they own or are a member of)
    const budget = await Budget.findOne({
      $or: [
        { owner: user._id },
        { 'members.user': user._id }
      ]
    }).sort({ createdAt: 1 });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      },
      budgetId: budget?._id || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', require('../middleware/auth').auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
