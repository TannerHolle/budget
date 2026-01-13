const express = require('express');
const router = express.Router();
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { auth } = require('../middleware/auth');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const Category = require('../models/Category');

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

// Initialize Plaid client
const plaidEnv = process.env.PLAID_ENV || 'sandbox';
const plaidClientId = process.env.PLAID_CLIENT_ID;
const plaidSecret = process.env.PLAID_SECRET;

if (!plaidClientId || !plaidSecret) {
  console.warn('Plaid credentials not configured. Bank connection features will not work.');
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnv] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': plaidClientId,
      'PLAID-SECRET': plaidSecret,
    },
  },
});

const client = new PlaidApi(configuration);

// Create link token
router.post('/create-link-token', auth, async (req, res) => {
  try {
    if (!plaidClientId || !plaidSecret) {
      return res.status(500).json({ 
        error: 'Plaid credentials not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET in environment variables.' 
      });
    }

    const { budgetId } = req.body;
    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const request = {
      user: {
        client_user_id: budgetId.toString(),
      },
      client_name: 'Budget Tracker',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    const response = await client.linkTokenCreate(request);
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);
    const errorMessage = error.response?.data?.error_message || error.message || 'Failed to create link token';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Exchange public token for access token
router.post('/exchange-public-token', auth, async (req, res) => {
  try {
    const { public_token, metadata, budgetId } = req.body;
    
    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const response = await client.itemPublicTokenExchange({
      public_token: public_token,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get institution info
    const itemResponse = await client.itemGet({
      access_token: accessToken,
    });

    const institutionId = itemResponse.data.item.institution_id;

    let institutionName = 'Unknown';
    if (institutionId) {
      try {
        const instResponse = await client.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US'],
        });
        institutionName = instResponse.data.institution.name;
      } catch (err) {
        console.error('Error fetching institution:', err);
      }
    }

    // Save access token to budget
    const budget = await Budget.findById(budgetId);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Check if this item already exists
    const existingIndex = budget.plaidAccessTokens.findIndex(
      token => token.itemId === itemId
    );

    if (existingIndex >= 0) {
      // Update existing token
      budget.plaidAccessTokens[existingIndex].accessToken = accessToken;
      budget.plaidAccessTokens[existingIndex].institutionName = institutionName;
    } else {
      // Add new token
      budget.plaidAccessTokens.push({
        itemId,
        accessToken,
        institutionId,
        institutionName,
      });
    }

    await budget.save();

    res.json({
      success: true,
      itemId,
      institutionName,
    });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    res.status(500).json({ error: 'Failed to exchange public token' });
  }
});

// Get accounts
router.get('/accounts', auth, async (req, res) => {
  try {
    const { budgetId } = req.query;
    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const budget = await Budget.findById(budgetId);
    if (!budget || !budget.plaidAccessTokens || budget.plaidAccessTokens.length === 0) {
      return res.json({ accounts: [] });
    }

    const allAccounts = [];

    for (const tokenData of budget.plaidAccessTokens) {
      try {
        const response = await client.accountsGet({
          access_token: tokenData.accessToken,
        });

        const accounts = response.data.accounts.map(account => ({
          account_id: account.account_id,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          balance: account.balances,
          institutionName: tokenData.institutionName,
          itemId: tokenData.itemId,
        }));

        allAccounts.push(...accounts);
      } catch (error) {
        console.error(`Error fetching accounts for ${tokenData.institutionName}:`, error);
      }
    }

    res.json({ accounts: allAccounts });
  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// Get transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const { start_date, end_date, budgetId } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const budget = await Budget.findById(budgetId);
    if (!budget || !budget.plaidAccessTokens || budget.plaidAccessTokens.length === 0) {
      return res.json({ transactions: [] });
    }

    const allTransactions = [];

    for (const tokenData of budget.plaidAccessTokens) {
      try {
        const response = await client.transactionsGet({
          access_token: tokenData.accessToken,
          start_date: start_date,
          end_date: end_date,
        });

        const transactions = response.data.transactions.map(transaction => ({
          transaction_id: transaction.transaction_id,
          account_id: transaction.account_id,
          amount: transaction.amount,
          date: transaction.date,
          name: transaction.name,
          merchant_name: transaction.merchant_name,
          category: transaction.category,
          institutionName: tokenData.institutionName,
        }));

        allTransactions.push(...transactions);
      } catch (error) {
        console.error(`Error fetching transactions for ${tokenData.institutionName}:`, error);
      }
    }

    res.json({ transactions: allTransactions });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Sync transactions (import as expenses)
router.post('/sync-transactions', auth, async (req, res) => {
  try {
    const { budgetId, start_date, end_date } = req.body;

    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const budget = await Budget.findById(budgetId);
    if (!budget || !budget.plaidAccessTokens || budget.plaidAccessTokens.length === 0) {
      return res.json({ imported: 0, skipped: 0, message: 'No Plaid connections found' });
    }

    // Default to last 30 days if dates not provided
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get all existing expenses with plaidTransactionId to avoid duplicates
    const existingExpenses = await Expense.find({
      budgetId,
      plaidTransactionId: { $exists: true }
    }).select('plaidTransactionId');
    const existingTransactionIds = new Set(existingExpenses.map(e => e.plaidTransactionId.toString()));

    // Get categories for this budget
    const categories = await Category.find({ budgetId }).sort({ order: 1 });
    const defaultCategory = categories.length > 0 ? categories[0]._id : null;

    if (!defaultCategory) {
      return res.status(400).json({ error: 'No categories found. Please create at least one category first.' });
    }

    let skipped = 0;
    const transactionsToCategorize = [];

    // Fetch accounts to identify credit card accounts
    const accountMap = new Map();
    for (const tokenData of budget.plaidAccessTokens) {
      try {
        const accountsResponse = await client.accountsGet({
          access_token: tokenData.accessToken,
        });
        accountsResponse.data.accounts.forEach(account => {
          accountMap.set(account.account_id, {
            type: account.type,
            subtype: account.subtype,
            name: account.name,
            institutionName: tokenData.institutionName
          });
        });
      } catch (error) {
        console.error(`Error fetching accounts for ${tokenData.institutionName}:`, error);
      }
    }

    // Fetch transactions from all connected accounts
    for (const tokenData of budget.plaidAccessTokens) {
      try {
        const response = await client.transactionsGet({
          access_token: tokenData.accessToken,
          start_date: startDate,
          end_date: endDate,
        });

        const transactions = response.data.transactions;

        for (const transaction of transactions) {
          console.log('Processing transaction:', {
            transaction_id: transaction.transaction_id,
            name: transaction.name,
            merchant_name: transaction.merchant_name,
            amount: transaction.amount,
            date: transaction.date,
            account_id: transaction.account_id,
            category: transaction.category,
            pending: transaction.pending
          });

          // Skip if already imported
          if (existingTransactionIds.has(transaction.transaction_id)) {
            console.log('  -> Skipped: Already imported');
            skipped++;
            continue;
          }

          // Get account info for display
          const accountInfo = accountMap.get(transaction.account_id);
          console.log('  -> Account info:', accountInfo);
          if (!accountInfo) {
            console.log('  -> Skipped: Account info not found');
            skipped++;
            continue;
          }

          // For credit cards: positive amount = charge (expense), negative = payment/credit
          // For depository accounts: positive amount = deposit, negative = withdrawal (expense)
          // Only import expenses (charges for credit cards, withdrawals for depository accounts)
          let isExpense = false;
          if (accountInfo.type === 'credit') {
            // Credit card: positive amount is a charge (expense)
            isExpense = transaction.amount > 0;
          } else if (accountInfo.type === 'depository') {
            // Checking/savings: negative amount is a withdrawal (expense)
            isExpense = transaction.amount < 0;
          } else {
            // Other account types: skip for now
            console.log('  -> Skipped: Unsupported account type');
            skipped++;
            continue;
          }

          if (!isExpense) {
            console.log('  -> Skipped: Not an expense (payment, deposit, or credit)');
            skipped++;
            continue;
          }

          // Normalize amount to positive for expenses
          const expenseAmount = Math.abs(transaction.amount);

          // Skip pending transactions
          if (transaction.pending) {
            console.log('  -> Skipped: Pending transaction');
            skipped++;
            continue;
          }

          // Add to list for user categorization
          transactionsToCategorize.push({
            transaction_id: transaction.transaction_id,
            name: transaction.name,
            merchant_name: transaction.merchant_name,
            amount: expenseAmount,
            date: transaction.date,
            plaidCategory: transaction.category || [],
            accountName: accountInfo.name || 'Unknown Account',
            institutionName: accountInfo.institutionName || 'Unknown Institution'
          });
        }
      } catch (error) {
        console.error(`Error syncing transactions for ${tokenData.institutionName}:`, error);
      }
    }

    res.json({
      transactions: transactionsToCategorize,
      skipped,
      message: `Found ${transactionsToCategorize.length} transactions to categorize, skipped ${skipped}`
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
});

// Remove Plaid connection
router.delete('/remove-connection/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { budgetId } = req.query;

    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const budget = await Budget.findById(budgetId);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Find and remove the token
    const tokenIndex = budget.plaidAccessTokens.findIndex(
      token => token.itemId === itemId
    );

    if (tokenIndex === -1) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Optionally remove the item from Plaid
    try {
      await client.itemRemove({
        access_token: budget.plaidAccessTokens[tokenIndex].accessToken,
      });
    } catch (error) {
      console.error('Error removing item from Plaid:', error);
    }

    budget.plaidAccessTokens.splice(tokenIndex, 1);
    await budget.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing connection:', error);
    res.status(500).json({ error: 'Failed to remove connection' });
  }
});

module.exports = router;
