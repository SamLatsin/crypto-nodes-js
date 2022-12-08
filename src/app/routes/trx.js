const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Trx = require('../classes/trx.class');
const router = express.Router();

if (process.env.TRX_TESTNET == 1) {
  
}
else {
  
}

router.post('/api/get/status/trx', async (req, res) => {
  if ("result" in result) {
    return res.send({ 
      status: 'done', 
      result: result,
    });
  }
  return res.status(400).send({ 
    status: 'error', 
    result: 'service not running',
  });
});

router.post('/api/create/wallet/trx', async (req, res) => {
  const wallet = await Wallet.getLastByTicker("trx");
  if (wallet && wallet.length !== 0) {
    name = 'w' + (parseInt(utils.getNumbers(wallet[0].name)[0]) + 1);
  }
  else {
    name = 'w1';
  }
  const wallet_token = utils.generateUUID();
  let fields = {
    ticker: 'trx',
    name: name,
    privateKey: data.privateKey,
    mnemonic: data.mnemonic,
    walletToken: wallet_token
  };
  await Wallet.insert(fields);
  fields = {
    name: name,
    address: data.address
  }
  await Trx.insert(fields);
  return res.send({ 
    status: 'done', 
    name: name,
    mnemonic: data.mnemonic,
    privateKey: data.privateKey,
    walletToken: wallet_token
  });
});

router.post('/api/get/address/trx', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    const address = await Trx.getByName(wallet.name);
    return res.send({ 
      status: 'done', 
      address: address[0].address,
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/balance/trx', async (req, res) => {
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
      name: name,
      balance: balance
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/fee/trx', async (req, res) => {
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
      result: fee.toFixed(8)
    });
  }
  return utils.badRequest(res);
});

router.post('/api/send/trx', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  const amount = req.body.amount;
  const to_address = req.body.address;
  const memo = req.body.memo;
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

router.post('/api/wallet/recover/trx', async (req, res) => {
  const mnemonic = req.body.mnemonic;
  const private_key = req.body.privateKey;
  const wallet = await Wallet.getLastByTicker("trx");
  if (wallet && wallet.length !== 0) {
    name = 'rw' + (parseInt(utils.getNumbers(wallet[0].name)[0]) + 1);
  }
  else {
    name = 'rw1';
  }

  if (!mnemonic) {
    data.mnemonic = null;
  }
  const wallet_token = utils.generateUUID();
  let fields = {
    ticker: 'trx',
    name: name,
    privateKey: data.privateKey,
    mnemonic: data.mnemonic,
    walletToken: wallet_token
  };
  await Wallet.insert(fields);
  fields = {
    name: name,
    address: data.address
  }
  await Trx.insert(fields);
  return res.send({ 
    status: 'done', 
    name: name,
    mnemonic: data.mnemonic,
    privateKey: data.privateKey,
    walletToken: wallet_token,
  });
});

router.post('/api/get/history/trx', async (req, res) => {
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
    
  }
  return utils.badRequest(res);
});

module.exports = router;