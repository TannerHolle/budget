const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');

// Get all expenses
router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('category')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expenses by date range
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    const expenses = await Expense.find(query)
      .populate('category')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create an expense
router.post('/', async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    await expense.populate('category');
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update an expense
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category');
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete an expense
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expenses by category
router.get('/by-category', async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = {};
    
    // Filter by month/year if provided
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    } else if (month || year) {
      // If only one is provided, use current month/year
      const now = new Date();
      const filterMonth = month ? parseInt(month) - 1 : now.getMonth();
      const filterYear = year ? parseInt(year) : now.getFullYear();
      const startDate = new Date(filterYear, filterMonth, 1);
      const endDate = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const expenses = await Expense.aggregate([
      ...(Object.keys(query).length > 0 ? [{ $match: query }] : []),
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $sort: { total: -1 }
      }
    ]);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
