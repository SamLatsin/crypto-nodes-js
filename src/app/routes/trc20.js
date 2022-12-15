const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Trx = require('../classes/trx.class');
const Trc20Contract = require('../classes/trx_contract_trc20.class');
const TronWeb = require('tronweb');
const TronGrid = require("trongrid");
const router = express.Router();

let contract = "";
let decimals = 0;
let eventServer = "";
if (process.env.TRX_TESTNET == 1) {
  contract = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj"; // my test token
  decimals = 1e6;
  eventServer = 'http://nile.trongrid.io';
}
else {
  contract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
  decimals = 1e6;
  eventServer = 'http://api.trongrid.io';
}

const fullNode = "http://tron:8090";
const solidityNode = "http://tron:8091";
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

router.post('/api/get/balance/trc20', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  const ticker = req.body.ticker;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    const trc20contract = await Trc20Contract.getByTicker(ticker);
    if (trc20contract && trc20contract.length > 0) {
      contract = trc20contract[0].address;
      decimals = trc20contract[0].decimals;
    }
    let address = await Trx.getByName(wallet.name);
    address = address[0].address;
    const contractObj = await tronWeb.contract().at(contract);
    tronWeb.setAddress(contract);
    let tokens = await contractObj.balanceOf(address).call();
    if (tokens._isBigNumber) {
      tokens = tokens._hex;
      tokens = tronWeb.toBigNumber(tokens);
      tokens = tokens.toNumber();
      tokens = parseFloat(tokens) / decimals;
    }
    else {
      tokens = 0;
    }
    return res.send({ 
      status: 'done', 
      name: name,
      tokens: tokens
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/fee/trc20', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  const amount = req.body.amount;
  const to_address = req.body.address;
  const ticker = req.body.ticker;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    const trc20contract = await Trc20Contract.getByTicker(ticker);
    if (trc20contract && trc20contract.length > 0) {
      contract = trc20contract[0].address;
      decimals = trc20contract[0].decimals;
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
  const ticker = req.body.ticker;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    const trc20contract = await Trc20Contract.getByTicker(ticker);
    if (trc20contract && trc20contract.length > 0) {
      contract = trc20contract[0].address;
      decimals = trc20contract[0].decimals;
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
  const ticker = req.body.ticker;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    const trc20contract = await Trc20Contract.getByTicker(ticker);
    if (trc20contract && trc20contract.length > 0) {
      contract = trc20contract[0].address;
      decimals = trc20contract[0].decimals;
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

router.post('/api/add/contract/trc20', async (req, res) => {
  const ticker = req.body.ticker;
  const address = req.body.address;
  const is_exists = await Trc20Contract.getByTicker(ticker);
  if (is_exists && is_exists.length > 0) {
    return res.status(400).send({ 
      status: 'error',
      error: 'ticker already exists'
    });
  }
  const contractObj = await tronWeb.contract().at(address);
  tronWeb.setAddress(address);
  let decimals = await contractObj.decimals().call();
  decimals = 10**parseInt(decimals);
  const fields = {
    ticker: ticker,
    address: address,
    decimals: decimals
  };
  await Trc20Contract.insert(fields);
  return res.send({ 
    status: 'done',
    fields: fields
  });
});

router.post('/api/delete/contract/trc20', async (req, res) => {
  const ticker = req.body.ticker;
  await Trc20Contract.deleteByTicker(ticker);
  return res.send({ 
    status: 'done',
  });
});

router.post('/api/get/contracts/trc20', async (req, res) => {
  const ticker = req.body.ticker;
  const contracts = await Trc20Contract.getAll();
  return res.send({ 
    status: 'done',
    result: contracts
  });
});

module.exports = router;