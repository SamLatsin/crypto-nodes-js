const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');

const router = express.Router();

router.post('/api/get/status/btc', async (req, res) => {
  // wallets = await Wallet.getWallets();
  result = await utils.sendRpc("getblockchaininfo", [], "bitcoin:8332/");
  if (result) {
    result = result.result;
  }
  res.send(
    { 
      status: 'done', 
      result: result,
    });
});

module.exports = router;
