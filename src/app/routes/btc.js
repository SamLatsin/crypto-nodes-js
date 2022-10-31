const express = require('express');
const Wallet = require('../classes/wallet.class');

const router = express.Router();

router.post('/api/get/status/btc', async (req, res) => {
  wallets = await Wallet.getWallets();

  res.send(
    { 
      message: 'Hello world', 
      wallets: wallets
    });
});

module.exports = router;
