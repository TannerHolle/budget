const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Liability = require('../models/Liability');

// Get net worth summary
router.get('/', async (req, res) => {
  try {
    const assets = await Asset.find();
    const liabilities = await Liability.find();
    
    const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.amount, 0);
    const netWorth = totalAssets - totalLiabilities;
    
    res.json({
      totalAssets,
      totalLiabilities,
      netWorth,
      assets: assets,
      liabilities: liabilities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
