const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Trx = require('../classes/trx.class');
const router = express.Router();

if (process.env.TRX_TESTNET == 1) {
  
}
else {

}

router.post('/api/get/balance/trc20', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    let address = await Trx.getByName(wallet.name);
    address = address[0].address;
    address = address.substring(2);

    const tokens = parseFloat(Number(result.result)) / decimals;
    return res.send({ 
      status: 'done', 
      name: name,
      tokens: isNaN(tokens) ? 0 : tokens,
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/fee/trc20', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  const amount = req.body.amount;
  const to_address = req.body.address;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }

    return res.send({ 
      status: 'done', 
      result: result
    });
  }
  return utils.badRequest(res);
});

router.post('/api/send/trc20', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  const amount = req.body.amount;
  const to_address = req.body.address;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    let from_address = await Trx.getByName(wallet.name);
    from_address = from_address[0].address;
    
    if ("error" in result) {
      return res.status(400).send({ 
        status: 'error', 
        error: result.error.message
      });
    }
    return res.send({ 
      status: 'done', 
      txHash: result.result
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/history/trc20', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    let address = await Trx.getByName(wallet.name);
    address = address[0].address;
    
    return res.send({ 
      status: 'done', 
      result: result
    });
  }
  return utils.badRequest(res);
});

module.exports = router;