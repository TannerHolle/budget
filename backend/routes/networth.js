const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Asset = require('../models/Asset');
const Liability = require('../models/Liability');
const Budget = require('../models/Budget');
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

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

// Helper function to make Teller API requests
const tellerRequest = async (method, path, accessToken) => {
  const TELLER_API_BASE = process.env.TELLER_API_BASE || 'https://api.teller.io';
  const TELLER_CERT_PATH = process.env.TELLER_CERT_PATH;
  const TELLER_KEY_PATH = process.env.TELLER_KEY_PATH;

  let httpsAgent = null;
  if (TELLER_CERT_PATH && TELLER_KEY_PATH) {
    try {
      const certPath = path.isAbsolute(TELLER_CERT_PATH) 
        ? TELLER_CERT_PATH 
        : path.resolve(__dirname, '..', TELLER_CERT_PATH);
      const keyPath = path.isAbsolute(TELLER_KEY_PATH) 
        ? TELLER_KEY_PATH 
        : path.resolve(__dirname, '..', TELLER_KEY_PATH);
      
      const cert = fs.readFileSync(certPath);
      const key = fs.readFileSync(keyPath);
      httpsAgent = new https.Agent({ cert, key });
    } catch (error) {
      console.error('Error loading Teller TLS certificates:', error.message);
    }
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (accessToken) {
    const basicAuth = Buffer.from(`${accessToken}:`).toString('base64');
    headers['Authorization'] = `Basic ${basicAuth}`;
  }

  const config = {
    method,
    url: `${TELLER_API_BASE}${path}`,
    headers,
    httpsAgent: httpsAgent
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Teller API error:', error.response?.data || error.message);
    throw error;
  }
};

// Get net worth summary
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

    // Get manual assets and liabilities (these don't have budgetId, so get all)
    const assets = await Asset.find();
    const liabilities = await Liability.find();
    
    let manualAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
    let manualLiabilities = liabilities.reduce((sum, liability) => sum + liability.amount, 0);

    // Get Teller accounts
    const budget = await Budget.findById(budgetId);
    const tellerAccounts = [];
    let tellerAssets = 0;
    let tellerLiabilities = 0;

    if (budget && budget.tellerAccessTokens && budget.tellerAccessTokens.length > 0) {
      for (const tokenData of budget.tellerAccessTokens) {
        try {
          const accounts = await tellerRequest('GET', '/accounts', tokenData.accessToken);
          
          for (const account of accounts) {
            let balance = 0;
            try {
              const balances = await tellerRequest('GET', `/accounts/${account.id}/balances`, tokenData.accessToken);
              if (balances) {
                balance = parseFloat(balances.current || balances.ledger || balances.available || 0);
              }
            } catch (error) {
              console.error(`Error fetching balance for account ${account.id}:`, error);
            }

            const accountData = {
              id: account.id,
              name: account.name,
              type: account.type,
              subtype: account.subtype,
              balance: balance,
              institutionName: account.institution?.name || tokenData.institutionName,
              lastFour: account.last_four
            };

            tellerAccounts.push(accountData);

            // Credit accounts are liabilities (negative balance = debt)
            if (account.type === 'credit') {
              tellerLiabilities += Math.abs(balance);
            } else {
              // Depository accounts are assets
              tellerAssets += balance;
            }
          }
        } catch (error) {
          console.error(`Error fetching accounts for ${tokenData.institutionName}:`, error);
        }
      }
    }

    const totalAssets = manualAssets + tellerAssets;
    const totalLiabilities = manualLiabilities + tellerLiabilities;
    const netWorth = totalAssets - totalLiabilities;
    
    res.json({
      totalAssets,
      totalLiabilities,
      netWorth,
      assets: assets,
      liabilities: liabilities,
      tellerAccounts: tellerAccounts,
      breakdown: {
        manualAssets,
        tellerAssets,
        manualLiabilities,
        tellerLiabilities
      }
    });
  } catch (error) {
    console.error('Error getting net worth:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
