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

async function getContractFee() {
  const sun_price = 200;
  const tronGrid = new TronGrid(tronWeb);
  const options = {
      onlyTo: true,
      onlyConfirmed: true,
      limit: 200,
      search_internal: false,
  };
  let transactions = await tronGrid.account.getTransactions(contract, options);
  transactions = transactions.data;
  let energy_list = [];
  for (let [key, transaction] of Object.entries(transactions)) {
    if (transaction.raw_data.contract[0].type == "TriggerSmartContract") {
      let contract_hex = transaction.raw_data.contract[0].parameter.value.contract_address;
      if (transaction.energy_usage_total > 0 && await TronWeb.address.fromHex(contract_hex) == contract) {
        energy_list.push(transaction.energy_usage_total);
      }
    }
  }
  const fee = (Math.max.apply(Math, energy_list) * sun_price) / 1e6 + 0.345;
  return fee;
}

async function transferContract(addressFrom, addressTo, amount, privKey, memo) {
    const contractObj = await tronWeb.contract().at(contract);
    tronWeb.setAddress(contract);
    tronWeb.setPrivateKey(privKey);
    finalAmount = tronWeb.toBigNumber(parseFloat(amount) * decimals);
    let transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        contract, 'transfer(address,uint256)', {
        },
        [{
            type: 'address',
            value: addressTo
        }, {
            type: 'uint256',
            value: finalAmount.toString(10)
        }]
    );
    transaction = transaction['transaction'];
    if (memo && memo.length > 0) {
      const memo_transaction = await tronWeb.transactionBuilder.addUpdateData(transaction, memo, "utf-8");
      const signedTransaction = await tronWeb.trx.sign(memo_transaction, privKey);
      const result = await tronWeb.trx.sendRawTransaction(signedTransaction);
      return result;
    }
    const signedTransaction = await tronWeb.trx.sign(transaction, privKey);
    const result = await tronWeb.trx.sendRawTransaction(signedTransaction);
    return result;
}

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
  const memo = req.body.memo;
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
    let fee = await getContractFee();
    if (memo) {
      fee = fee + 1;
    }
    return res.send({ 
      status: 'done', 
      result: fee
    });
  }
  return utils.badRequest(res);
});

router.post('/api/send/trc20', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  const amount = req.body.amount;
  const to_address = req.body.address;
  const memo = req.body.memo;
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
    let result = null;
    try {
      result = await transferContract(from_address, to_address, amount, wallet.privateKey, memo);
    }
    catch (error) {
      return res.status(400).send({ 
        status: 'error', 
        error: 'insufficient funds',
      });
    }
    return res.send({ 
      status: 'done', 
      txid: result.txid
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
    const tronGrid = new TronGrid(tronWeb);
    const options = {
        limit: 200,
        contract_address: contract,
    };
    let transactions = await tronGrid.account.getTrc20Transactions(address, options);
    transactions = transactions.data;
    for (let [key, transaction] of Object.entries(transactions)) {
      transactions[key].value = parseFloat(transaction.value) / (10**transaction.token_info.decimals);
    }
    return res.send({ 
      status: 'done', 
      result: transactions
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