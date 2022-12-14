const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Trx = require('../classes/trx.class');
const TronWeb = require('tronweb')
const router = express.Router();

const fullNode = "http://tron:8090";
const solidityNode = "http://tron:8091";
const tronWeb = new TronWeb(fullNode, solidityNode);

let contract = "";
let decimals = 0;
if (process.env.TRX_TESTNET == 1) {
  contract = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"; // my test token
  decimals = 1e18;
}
else {
  contract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
  decimals = 1e6;
}

async function generateWallet(mnemonic = null, private_key = null) {
  const hdWallet = require("tron-wallet-hd");
  const hdUtils = hdWallet.utils;
  if (!mnemonic) {
    mnemonic = hdUtils.generateMnemonic();
  }
  if (!private_key) {
    account = await hdUtils.getAccountAtIndex(mnemonic,1);
    private_key = account.privateKey;
    address = account.address;
  }
  else {
    address = await hdUtils.getAccountFromPrivateKey(private_key);
  }
  const res = {
    "mnemonic": mnemonic,
    "privateKey": private_key,
    "address": address
  };
  return res;
}

async function createTx(addressFrom, addressTo, amount, privKey, memo) {
  const transaction = await tronWeb.transactionBuilder.sendTrx(addressTo, amount, addressFrom)
  if (memo && memo.length > 0) {
    const memo_transaction = await tronWeb.transactionBuilder.addUpdateData(transaction, String(memo));
    const signedTransaction = await tronWeb.trx.sign(memo_transaction, privKey);
    const result = await tronWeb.trx.sendRawTransaction(signedTransaction);
    return result;
  }
  const signedTransaction = await tronWeb.trx.sign(transaction, privKey);
  const result = await tronWeb.trx.sendRawTransaction(signedTransaction);
  return result;
}

router.post('/api/get/status/trx', async (req, res) => {
  let result = await tronWeb.trx.getNodeInfo();
  return res.send({ 
    status: 'done', 
    result: result
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
  data = await generateWallet();
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
    let balance = await tronWeb.trx.getBalance(address);
    balance = balance / 1e6;
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
      balance: balance,
      tokens: tokens
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
    let from_address = await Trx.getByName(wallet.name);
    from_address = from_address[0].address;
    let tx_bandwidth = 0;
    let address_bandwidth = 0;
    try {
      const transaction = await tronWeb.transactionBuilder.sendTrx(to_address, parseInt(amount*1e6), from_address);
      const signedTransaction = await tronWeb.trx.sign(transaction, wallet.privateKey);
      address_bandwidth = await tronWeb.trx.getBandwidth(from_address);
      let tx_bandwidth = signedTransaction.raw_data_hex.length;
    }
    catch (error) {
      return res.status(400).send({ 
        status: 'error', 
        error: 'insufficient funds'
      });
    }
    let fee = 0;
    if (parseInt(address_bandwidth) < parseInt(tx_bandwidth)) {
      fee = parseFloat(tx_bandwidth) / 1e3;
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
    let result = null;
    try {
      result = await createTx(from_address, to_address, parseInt(amount*1e6), wallet.privateKey, memo);
    }
    catch (error) {
      return res.status(400).send({ 
        status: 'error', 
        error: 'insufficient funds'
      });
    }
    return res.send({ 
      status: 'done', 
      txid: result
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
  data = await generateWallet(mnemonic, private_key);
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

router.post('/api/get/wallets/trx', async (req, res) => {
  const wallets = await Wallet.getByTicker('trx');
  return res.send({ 
    status: 'done',
    result: wallets
  });
});

router.post('/api/test/trx', async (req, res) => {
  result = await tronWeb.trx.getCurrentBlock();
  return res.send({ 
    status: 'done',
    result: result
  });
});

module.exports = router;