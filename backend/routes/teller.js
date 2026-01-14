const express = require('express');
const router = express.Router();
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
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

// Teller API configuration
const TELLER_API_BASE = process.env.TELLER_API_BASE || 'https://api.teller.io';
const TELLER_APP_ID = process.env.TELLER_APP_ID;
const TELLER_CERT_PATH = process.env.TELLER_CERT_PATH;
const TELLER_KEY_PATH = process.env.TELLER_KEY_PATH;
const TELLER_ENVIRONMENT = process.env.TELLER_ENVIRONMENT || 'production'; // 'sandbox' or 'production'

// Load TLS certificate and key for mTLS authentication
let httpsAgent = null;
if (TELLER_CERT_PATH && TELLER_KEY_PATH) {
  try {
    // Resolve paths - if relative, resolve from backend directory
    const certPath = path.isAbsolute(TELLER_CERT_PATH) 
      ? TELLER_CERT_PATH 
      : path.resolve(__dirname, '..', TELLER_CERT_PATH);
    const keyPath = path.isAbsolute(TELLER_KEY_PATH) 
      ? TELLER_KEY_PATH 
      : path.resolve(__dirname, '..', TELLER_KEY_PATH);
    
    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    httpsAgent = new https.Agent({
      cert,
      key
    });
    console.log('Teller TLS certificates loaded successfully');
  } catch (error) {
    console.error('Error loading Teller TLS certificates:', error.message);
    console.error('Cert path:', TELLER_CERT_PATH);
    console.error('Key path:', TELLER_KEY_PATH);
  }
}

if (!TELLER_APP_ID) {
  console.warn('TELLER_APP_ID not configured. Bank connection features will not work.');
}

if (!httpsAgent) {
  console.warn('Teller TLS certificates not loaded. API calls to Teller will fail.');
  console.warn('Required: TELLER_CERT_PATH, TELLER_KEY_PATH');
  console.warn('Note: Connect flow will work, but syncing accounts/transactions requires certificates.');
}

// Helper function to make Teller API requests
const tellerRequest = async (method, path, accessToken = null, data = null) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  // For requests with access tokens (user data), use HTTP Basic Auth
  // Format: ACCESS_TOKEN: (token with empty password)
  if (accessToken) {
    const basicAuth = Buffer.from(`${accessToken}:`).toString('base64');
    headers['Authorization'] = `Basic ${basicAuth}`;
  }

  const config = {
    method,
    url: `${TELLER_API_BASE}${path}`,
    headers,
    httpsAgent: httpsAgent // Use mTLS for all requests
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Teller API error:', error.response?.data || error.message);
    throw error;
  }
};

// Create Connect token
router.post('/create-link-token', auth, async (req, res) => {
  try {
    if (!TELLER_APP_ID) {
      return res.status(500).json({ 
        error: 'Teller credentials not configured. Please set TELLER_APP_ID in environment variables.' 
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

    // Teller uses Connect tokens for OAuth flow
    // The frontend will handle the Connect flow and return an access token
    // This endpoint returns the app ID and environment so frontend doesn't need env variable
    res.json({ 
      link_token: 'teller-connect-ready',
      app_id: TELLER_APP_ID,
      environment: TELLER_ENVIRONMENT
    });
  } catch (error) {
    console.error('Error creating connect token:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to create connect token';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Exchange access token (Teller Connect returns access token directly)
router.post('/exchange-public-token', auth, async (req, res) => {
  try {
    if (!httpsAgent) {
      return res.status(500).json({ 
        error: 'Teller TLS certificates not configured. Please set TELLER_CERT_PATH and TELLER_KEY_PATH in environment variables.' 
      });
    }

    const { access_token, metadata, budgetId } = req.body;
    
    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    if (!access_token) {
      return res.status(400).json({ error: 'access_token is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    // Verify the access token by fetching accounts
    let accounts;
    let institutionName = 'Unknown';
    try {
      accounts = await tellerRequest('GET', '/accounts', access_token);
      
      // Get institution name from first account if available
      if (accounts && accounts.length > 0 && accounts[0].institution) {
        institutionName = accounts[0].institution.name || 'Unknown';
      } else if (metadata && metadata.institution) {
        institutionName = metadata.institution.name || 'Unknown';
      }
    } catch (error) {
      console.error('Error verifying access token:', error);
      return res.status(400).json({ error: 'Invalid access token' });
    }

    // Save access token to budget
    const budget = await Budget.findById(budgetId);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Teller uses access tokens per connection, not per item
    // We'll use the first account's connection ID as the identifier
    const connectionId = accounts && accounts.length > 0 
      ? accounts[0].connection_id || access_token.substring(0, 20)
      : access_token.substring(0, 20);

    // Check if this connection already exists
    const existingIndex = budget.tellerAccessTokens.findIndex(
      token => token.connectionId === connectionId || token.accessToken === access_token
    );

    if (existingIndex >= 0) {
      // Update existing token
      budget.tellerAccessTokens[existingIndex].accessToken = access_token;
      budget.tellerAccessTokens[existingIndex].institutionName = institutionName;
    } else {
      // Add new token
      budget.tellerAccessTokens.push({
        connectionId: connectionId,
        accessToken: access_token,
        institutionName: institutionName,
      });
    }

    await budget.save();

    res.json({
      success: true,
      connectionId,
      institutionName,
    });
  } catch (error) {
    console.error('Error exchanging access token:', error);
    res.status(500).json({ error: 'Failed to save connection' });
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
    if (!budget || !budget.tellerAccessTokens || budget.tellerAccessTokens.length === 0) {
      return res.json({ accounts: [] });
    }

    const allAccounts = [];

    for (const tokenData of budget.tellerAccessTokens) {
      try {
        const accounts = await tellerRequest('GET', '/accounts', tokenData.accessToken);

        // Fetch balances for each account
        const formattedAccounts = await Promise.all(accounts.map(async (account) => {
          let balanceValue = 0;
          let availableBalance = 0;
          
          // Fetch balance from the balances endpoint
          try {
            const balances = await tellerRequest('GET', `/accounts/${account.id}/balances`, tokenData.accessToken);
            if (balances) {
              // Teller balances structure
              if (balances.available !== undefined && balances.available !== null) {
                availableBalance = parseFloat(balances.available);
              }
              if (balances.current !== undefined && balances.current !== null) {
                balanceValue = parseFloat(balances.current);
              } else if (balances.ledger !== undefined && balances.ledger !== null) {
                balanceValue = parseFloat(balances.ledger);
              } else {
                // Fallback to available if current/ledger not available
                balanceValue = availableBalance;
              }
            }
          } catch (error) {
            console.error(`Error fetching balance for account ${account.id}:`, error);
            // Continue with 0 balance if fetch fails
          }
          
          return {
            account_id: account.id,
            name: account.name || account.type,
            type: account.type || 'depository',
            subtype: account.subtype || account.type,
            balance: {
              current: balanceValue,
              available: availableBalance || balanceValue
            },
            institutionName: account.institution?.name || tokenData.institutionName,
            connectionId: tokenData.connectionId,
          };
        }));

        allAccounts.push(...formattedAccounts);
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
    const { start_date, end_date, budgetId, account_id } = req.query;

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
    if (!budget || !budget.tellerAccessTokens || budget.tellerAccessTokens.length === 0) {
      return res.json({ transactions: [] });
    }

    const allTransactions = [];

    for (const tokenData of budget.tellerAccessTokens) {
      try {
        // Teller API: GET /accounts/{account_id}/transactions
        // If account_id is provided, fetch for that account only
        // Otherwise, fetch for all accounts
        let accounts = [];
        if (account_id) {
          accounts = [{ id: account_id }];
        } else {
          const accountsResponse = await tellerRequest('GET', '/accounts', tokenData.accessToken);
          accounts = accountsResponse;
        }

        for (const account of accounts) {
          try {
            const transactions = await tellerRequest(
              'GET',
              `/accounts/${account.id}/transactions?start_date=${start_date}&end_date=${end_date}`,
              tokenData.accessToken
            );

            const formattedTransactions = transactions.map(transaction => ({
              transaction_id: transaction.id,
              account_id: transaction.account_id || account.id,
              amount: parseFloat(transaction.amount) || 0,
              date: transaction.date,
              name: transaction.description || transaction.merchant?.name || 'Transaction',
              merchant_name: transaction.merchant?.name,
              category: transaction.category ? [transaction.category] : [],
              institutionName: tokenData.institutionName,
            }));

            allTransactions.push(...formattedTransactions);
          } catch (error) {
            console.error(`Error fetching transactions for account ${account.id}:`, error);
          }
        }
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
    
    console.log('Sync request received:', { budgetId, start_date, end_date });

    if (!budgetId) {
      return res.status(400).json({ error: 'budgetId is required' });
    }

    const hasAccess = await verifyBudgetAccess(req.user._id, budgetId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this budget' });
    }

    const budget = await Budget.findById(budgetId);
    if (!budget || !budget.tellerAccessTokens || budget.tellerAccessTokens.length === 0) {
      return res.json({ imported: 0, skipped: 0, message: 'No Teller connections found' });
    }

    // Default to last 30 days if dates not provided
    const today = new Date();
    const endDate = end_date || today.toISOString().split('T')[0];
    
    let startDate;
    if (start_date) {
      startDate = start_date;
    } else {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }
    
    console.log('Sync date range:', { startDate, endDate, today: today.toISOString() });

    // Get all existing expenses with tellerTransactionId to avoid duplicates
    const existingExpenses = await Expense.find({
      budgetId,
      tellerTransactionId: { $exists: true }
    }).select('tellerTransactionId');
    const existingTransactionIds = new Set(existingExpenses.map(e => e.tellerTransactionId.toString()));

    // Get categories for this budget
    const categories = await Category.find({ budgetId }).sort({ order: 1 });
    const defaultCategory = categories.length > 0 ? categories[0]._id : null;

    if (!defaultCategory) {
      return res.status(400).json({ error: 'No categories found. Please create at least one category first.' });
    }

    let skipped = 0;
    const transactionsToCategorize = [];

    // Fetch accounts to identify account types
    const accountMap = new Map();
    for (const tokenData of budget.tellerAccessTokens) {
      try {
        const accounts = await tellerRequest('GET', '/accounts', tokenData.accessToken);
        accounts.forEach(account => {
          accountMap.set(account.id, {
            type: account.type || 'depository',
            subtype: account.subtype || account.type || 'checking',
            name: account.name || account.type,
            institutionName: tokenData.institutionName
          });
        });
      } catch (error) {
        console.error(`Error fetching accounts for ${tokenData.institutionName}:`, error);
      }
    }

    // Fetch transactions from all connected accounts
    for (const tokenData of budget.tellerAccessTokens) {
      try {
        const accounts = await tellerRequest('GET', '/accounts', tokenData.accessToken);

        for (const account of accounts) {
          try {
            const transactionsUrl = `/accounts/${account.id}/transactions?start_date=${startDate}&end_date=${endDate}`;
            console.log(`Fetching transactions from Teller: ${transactionsUrl}`);
            const transactions = await tellerRequest(
              'GET',
              transactionsUrl,
              tokenData.accessToken
            );
            console.log(`Received ${transactions.length} transactions from Teller`);

            for (const transaction of transactions) {
              console.log('Processing transaction:', {
                transaction_id: transaction.id,
                description: transaction.description,
                merchant_name: transaction.merchant?.name,
                amount: transaction.amount,
                date: transaction.date,
                account_id: account.id,
                category: transaction.category,
                status: transaction.status
              });

              // Skip if already imported
              if (existingTransactionIds.has(transaction.id)) {
                console.log('  -> Skipped: Already imported');
                skipped++;
                continue;
              }

              // Get account info for display
              const accountInfo = accountMap.get(account.id);
              console.log('  -> Account info:', accountInfo);
              if (!accountInfo) {
                console.log('  -> Skipped: Account info not found');
                skipped++;
                continue;
              }

              // Teller amounts: negative = expense (outgoing), positive = income (incoming)
              // Only import expenses (negative amounts)
              const transactionAmount = parseFloat(transaction.amount) || 0;
              const isExpense = transactionAmount < 0;

              if (!isExpense) {
                console.log('  -> Skipped: Not an expense (income or deposit)');
                skipped++;
                continue;
              }

              // Normalize amount to positive for expenses
              const expenseAmount = Math.abs(transactionAmount);

              // Skip pending transactions
              if (transaction.status === 'pending') {
                console.log('  -> Skipped: Pending transaction');
                skipped++;
                continue;
              }

              // Add to list for user categorization
              transactionsToCategorize.push({
                transaction_id: transaction.id,
                name: transaction.description || transaction.merchant?.name || 'Transaction',
                merchant_name: transaction.merchant?.name,
                amount: expenseAmount,
                date: transaction.date,
                tellerCategory: transaction.category ? [transaction.category] : [],
                accountName: accountInfo.name || 'Unknown Account',
                institutionName: accountInfo.institutionName || 'Unknown Institution'
              });
            }
          } catch (error) {
            console.error(`Error fetching transactions for account ${account.id}:`, error);
          }
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

// Remove Teller connection
router.delete('/remove-connection/:connectionId', auth, async (req, res) => {
  try {
    const { connectionId } = req.params;
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
    const tokenIndex = budget.tellerAccessTokens.findIndex(
      token => token.connectionId === connectionId
    );

    if (tokenIndex === -1) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Note: Teller doesn't require explicit disconnection via API
    // Just remove from our database
    budget.tellerAccessTokens.splice(tokenIndex, 1);
    await budget.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing connection:', error);
    res.status(500).json({ error: 'Failed to remove connection' });
  }
});

module.exports = router;
