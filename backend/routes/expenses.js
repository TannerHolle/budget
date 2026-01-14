const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const { auth } = require('../middleware/auth');

// Helper to verify budget access
const verifyBudgetAccess = async (userId, budgetId) => {
  const budget = await Budget.findOne({
    _id: budgetId,
    $or: [
      { owner: userId },
      { 'members.user': userId }
    ]
  });
  return !!budget;
};

// Get all expenses
router.get('/', auth, async (req, res) => {
  try {
    const { budgetId } = req.query;
    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const expenses = await Expense.find({ budgetId })
      .populate('category')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expenses by date range
router.get('/range', auth, async (req, res) => {
  try {
    const { startDate, endDate, budgetId } = req.query;
    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const query = { budgetId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    const expenses = await Expense.find(query)
      .populate('category')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create an expense
router.post('/', auth, async (req, res) => {
  try {
    const { budgetId } = req.body;
    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    // Ensure date is properly formatted
    let expenseDate = req.body.date;
    if (typeof expenseDate === 'string') {
      // If date is a string like "2026-01-10", parse it and set to start of day UTC
      const dateParts = expenseDate.split('T')[0].split('-');
      if (dateParts.length === 3) {
        expenseDate = new Date(Date.UTC(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[2]),
          0, 0, 0, 0
        ));
      } else {
        expenseDate = new Date(expenseDate);
      }
    } else if (expenseDate instanceof Date) {
      // If it's already a Date, use it as is
      expenseDate = expenseDate;
    } else {
      expenseDate = new Date();
    }

    const expense = new Expense({
      ...req.body,
      date: expenseDate,
      budgetId,
      createdBy: req.user._id
    });
    await expense.save();
    await expense.populate('category');
    await expense.populate('createdBy', 'name email');
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update an expense
router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, expense.budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    // Ensure date is properly formatted if provided
    const updateData = { ...req.body };
    if (updateData.date) {
      if (typeof updateData.date === 'string') {
        const dateParts = updateData.date.split('T')[0].split('-');
        if (dateParts.length === 3) {
          updateData.date = new Date(Date.UTC(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2]),
            0, 0, 0, 0
          ));
        } else {
          updateData.date = new Date(updateData.date);
        }
      }
    }

    const updated = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('category')
      .populate('createdBy', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete an expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, expense.budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get months with expenses
router.get('/months', auth, async (req, res) => {
  try {
    const { budgetId } = req.query;
    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const months = await Expense.aggregate([
      { $match: { budgetId: new mongoose.Types.ObjectId(budgetId) } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month'
        }
      }
    ]);
    res.json(months);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk create expenses (for synced transactions)
router.post('/bulk', auth, async (req, res) => {
  try {
    const { budgetId, transactions } = req.body;
    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'transactions array is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const expenses = [];
    for (const txn of transactions) {
      if (!txn.category || !txn.transaction_id) {
        continue; // Skip if no category assigned
      }

      let expenseDate = new Date(txn.date);
      if (typeof txn.date === 'string') {
        const dateParts = txn.date.split('T')[0].split('-');
        if (dateParts.length === 3) {
          expenseDate = new Date(Date.UTC(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2]),
            0, 0, 0, 0
          ));
        } else {
          expenseDate = new Date(txn.date);
        }
      }

      const expense = new Expense({
        amount: txn.amount,
        description: txn.merchant_name || txn.name || 'Teller Transaction',
        category: txn.category,
        date: expenseDate,
        budgetId,
        createdBy: req.user._id,
        tellerTransactionId: txn.transaction_id,
        accountName: txn.accountName,
        institutionName: txn.institutionName
      });

      await expense.save();
      await expense.populate('category');
      expenses.push(expense);
    }

    res.status(201).json({ expenses, count: expenses.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get expenses by category
router.get('/by-category', auth, async (req, res) => {
  try {
    const { month, year, budgetId } = req.query;
    
    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const query = { budgetId: new mongoose.Types.ObjectId(budgetId) };
    
    // Filter by month/year if provided
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      // Use UTC dates to avoid timezone issues
      // Start of month: first day at 00:00:00 UTC
      const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
      // End of month: last day at 23:59:59.999 UTC
      // monthNum is 1-12, so monthNum - 1 is 0-11 (correct for Date.UTC)
      // To get last day of month, use next month's day 0
      const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
      query.date = { $gte: startDate, $lte: endDate };
    } else if (month || year) {
      // If only one is provided, use current month/year
      const now = new Date();
      const filterMonth = month ? parseInt(month) - 1 : now.getUTCMonth();
      const filterYear = year ? parseInt(year) : now.getUTCFullYear();
      const startDate = new Date(Date.UTC(filterYear, filterMonth, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(filterYear, filterMonth + 1, 0, 23, 59, 59, 999));
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const expenses = await Expense.aggregate([
      { $match: query },
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
