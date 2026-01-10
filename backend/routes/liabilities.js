const express = require('express');
const router = express.Router();
const Liability = require('../models/Liability');

// Get all liabilities
router.get('/', async (req, res) => {
  try {
    const liabilities = await Liability.find().sort({ createdAt: -1 });
    res.json(liabilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a liability
router.post('/', async (req, res) => {
  try {
    const liability = new Liability(req.body);
    await liability.save();
    res.status(201).json(liability);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a liability
router.put('/:id', async (req, res) => {
  try {
    const liability = await Liability.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!liability) {
      return res.status(404).json({ error: 'Liability not found' });
    }
    res.json(liability);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a liability
router.delete('/:id', async (req, res) => {
  try {
    const liability = await Liability.findByIdAndDelete(req.params.id);
    if (!liability) {
      return res.status(404).json({ error: 'Liability not found' });
    }
    res.json({ message: 'Liability deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
