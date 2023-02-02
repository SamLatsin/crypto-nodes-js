const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Trx = require('../classes/trx.class');
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

router.post('/api/wallet/authenticate/trx', async (req, res) => {
  const name = req.body.name;
  const walletToken = req.body.walletToken;
  return await utils.jwtAuthenticate(name, walletToken, "trx", res);
});

router.post('/api/wallet/authenticate/refresh/trx', async (req, res) => {
  const token = req.body.refreshToken;
  return await utils.jwtRefresh(token, "trx", res);
});

router.post('/api/wallet/change_token/trx', utils.checkJwtToken, async (req, res) => {
  const oldToken = req.body.oldWalletToken;
  const newToken = req.body.newWalletToken;
  const walletJwt = req.walletJwt;
  let wallet = await Wallet.getByTickerAndName('trx', walletJwt.name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != oldToken) {
      return utils.badRequest(res);
    }
    fields = {
      walletToken: newToken
    };
    await Wallet.update(fields, wallet.id);
    return res.send({ 
      status: 'done', 
      result: newToken
    });
  }
  return utils.badRequest(res);
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

router.post('/api/get/address/trx', utils.checkJwtToken, async (req, res) => {
  const name = req.body.name;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    const address = await Trx.getByName(wallet.name);
    return res.send({ 
      status: 'done', 
      address: address[0].address,
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/balance/trx', utils.checkJwtToken, async (req, res) => {
  const name = req.body.name;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
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

router.post('/api/get/fee/trx', utils.checkJwtToken, async (req, res) => {
  const name = req.body.name;
  const amount = req.body.amount;
  const to_address = req.body.address;
  const memo = req.body.memo;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
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
    if (memo) {
      fee = fee + 1;
    }
    return res.send({ 
      status: 'done', 
      result: parseFloat(fee.toFixed(8))
    });
  }
  return utils.badRequest(res);
});

router.post('/api/send/trx', utils.checkJwtToken, async (req, res) => {
  const name = req.body.name;
  const amount = req.body.amount;
  const to_address = req.body.address;
  const memo = req.body.memo;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
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
      txid: result.txid
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

router.post('/api/get/history/trx', utils.checkJwtToken, async (req, res) => {
  const name = req.body.name;
  let wallet = await Wallet.getByTickerAndName('trx', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    let address = await Trx.getByName(wallet.name);
    address = address[0].address;
    const tronGrid = new TronGrid(tronWeb);
    const options = {
        // onlyTo: true,
        // onlyConfirmed: true,
        limit: 200,
        orderBy: 'timestamp,asc',
        // minBlockTimestamp: Date.now() - 60000 // from a minute ago to go on
    };
    let transactions = await tronGrid.account.getTransactions(address, options);
    transactions = transactions.data;
    for (let [key, transaction] of Object.entries(transactions)) {
      // if (transaction.raw_data.contract[0].type == "TriggerSmartContract" || transaction.raw_data.contract[0].type == "CreateSmartContract") {
      //   transactions.splice(key, 1);
      // }
      let toConvert = transactions[key].raw_data.contract[0].parameter.value.owner_address;
      transactions[key].raw_data.contract[0].parameter.value.owner_address = TronWeb.address.fromHex(toConvert);
      toConvert = transactions[key].raw_data.contract[0].parameter.value.to_address;
      transactions[key].raw_data.contract[0].parameter.value.to_address = TronWeb.address.fromHex(toConvert);
      if ("ret" in transaction) {
        transactions[key].ret[0].fee = parseFloat(transaction.ret[0].fee / 1e6);
      }
      if ("raw_data" in transaction) {
        if ("data" in transaction.raw_data) {
          transactions[key].raw_data.data = TronWeb.toAscii(transaction.raw_data.data);
        }
        transactions[key].raw_data.contract[0].parameter.value.amount = parseFloat(transaction.raw_data.contract[0].parameter.value.amount) / 1e6;
      }
      transactions[key].net_fee = parseFloat(transaction.net_fee) / 1e6;
    }
    return res.send({ 
      status: 'done', 
      result: transactions
    });
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

// router.post('/api/test/trx', async (req, res) => {
//   let result = await TronWeb.address.fromHex("41ea51342dabbb928ae1e576bd39eff8aaf070a8c6");
//   // let result = await tronWeb.trx.getCurrentBlock();
//   // // result = await tronWeb.trx.getContract(contract);
//   // let instance = await tronWeb.contract.at(contract);
//   // result = await instance.decimals().call(); 
//   return res.send({ 
//     status: 'done',
//     result: result
//   });
// });

module.exports = router;