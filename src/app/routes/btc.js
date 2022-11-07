const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Btc = require('../classes/btc.class');
const BtcTransaction = require('../classes/btc_transaction.class');
const Mnemonic = require('bitcore-mnemonic');
const Bitcore = require('bitcore-lib');
const router = express.Router();

network = "";
if (process.env.BTC_TESTNET == 1) {
  network = "testnet";
}
else {
  network = "livenet";
}

async function isRecovering(name) {
  debug1 = await utils.sendRpc("loadwallet", [name], "bitcoin:8332/");
  result = await utils.sendRpc("getwalletinfo", [], "bitcoin:8332/wallet/" + name);
  if ("scanning" in result.result) {
    result = result.result.scanning;
  }
  else {
    result = false;
  }
  if (result == false) {
    return false;
  }
  return true;
}

async function updateBalance(name) {
  transactions = await BtcTransaction.getToSync(name);
  addresses = await Btc.getByName(name);
  for (const [key, transaction] of Object.entries(transactions)) {
    fee = transaction.fee;
    console.log(fee);
  }



  return true;
}

router.post('/api/get/status/btc', async (req, res) => {
  result = await utils.sendRpc("getblockchaininfo", [], "bitcoin:8332/");
  if (result) {
    result = result.result;
  }
  return res.send({ 
    status: 'done', 
    result: result,
  });
});

router.post('/api/create/wallet/btc', async (req, res) => {
  code = new Mnemonic(Mnemonic.Words.ENGLISH);
  // code = new Mnemonic("cradle cabin carbon soccer stumble ball ankle excuse fortune rebuild mobile collect");
  mnemonic = code.toString();
  private_key_hex = code.toHDPrivateKey(null, network).privateKey;
  private_key = new Bitcore.PrivateKey(private_key_hex, network).toWIF();
  wallet = await Wallet.getLastByTicker("btc");
  console.log(wallet);
  if (wallet && wallet.length !== 0) {
    name = 'w' + (parseInt(utils.getNumbers(wallet[0].name)[0]) + 1);
  }
  else {
    name = 'w1';
  }
  debug = await utils.sendRpc("createwallet", [name, false, true, null, false, false], "bitcoin:8332/");
  debug1 = await utils.sendRpc("sethdseed", [true, private_key], "bitcoin:8332/wallet/" + name);
  debug2 = await utils.sendRpc("unloadwallet", [name], "bitcoin:8332/");
  wallet_token = utils.generateUUID();
  fields = {
    ticker: 'btc',
    name: name,
    privateKey: private_key,
    mnemonic: mnemonic,
    walletToken: wallet_token
  };
  await Wallet.insert(fields);
  return res.send({ 
    status: 'done', 
    name: name,
    mnemonic: mnemonic,
    privateKey: private_key,
    walletToken: wallet_token,
    // debug: debug,
    // debug1: debug1,
    // debug2: debug2
  });
});

router.post('/api/get/balance/btc', async (req, res) => {
  name = req.body.name;
  token = req.body.walletToken;
  wallet = await Wallet.getByTickerAndName('btc', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    if (await isRecovering(wallet.name)) {
      return res.send({
        status: "recovering"
      });
    }
    debug1 = await utils.sendRpc("loadwallet", [wallet.name], "bitcoin:8332/");
    debug2 = await utils.sendRpc("getwalletinfo", [], "bitcoin:8332/wallet/" + name);
    balance = debug2.result.balance;
    unconfirmed_balance = debug2.result.unconfirmed_balance;
    immature_balance = debug2.result.immature_balance;
    return res.send({ 
      status: 'done', 
      name: name,
      balance: balance,
      unconfirmed_balance: unconfirmed_balance,
      immature_balance: immature_balance,
      // debug1: debug1,
      // debug2: debug2
    });
  }
  return utils.badRequest(res);
});

router.post('/api/create/address/btc', async (req, res) => {
  name = req.body.name;
  token = req.body.walletToken;
  wallet = await Wallet.getByTickerAndName('btc', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    if (await isRecovering(wallet.name)) {
      return res.send({
        status: "recovering"
      });
    }
    debug1 = await utils.sendRpc("loadwallet", [wallet.name], "bitcoin:8332/");
    debug2 = await utils.sendRpc("getnewaddress", [], "bitcoin:8332/wallet/" + name);
    address = debug2.result;
    fields = {
      name: wallet.name,
      address: address,
    }
    await Btc.insert(fields);
    return res.send({ 
      status: 'done',
      name: name,
      address: address,
      // debug1: debug1,
      // debug2: debug2
    });
  }
  return utils.badRequest(res);
});

router.post('/api/wallet/get_addresses/btc', async (req, res) => {
  name = req.body.name;
  token = req.body.walletToken;
  wallet = await Wallet.getByTickerAndName('btc', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    if (await isRecovering(wallet.name)) {
      return res.send({
        status: "recovering"
      });
    }
    addresses_raw = await Btc.getByName(name);
    addresses = [];
    for (const element of addresses_raw) {
      addresses.push(element.address);
    }
    return res.send({ 
      status: 'done', 
      result: addresses
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/address_balance/btc', async (req, res) => {
  name = req.body.name;
  token = req.body.walletToken;
  address = req.body.address;
  wallet = await Wallet.getByTickerAndName('btc', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    if (await isRecovering(wallet.name)) {
      return res.send({
        status: "recovering"
      });
    }
    await updateBalance(name);
    balance = await Btc.getByNameAndAddress(name, address);
    if (balance && balance.length !== 0) {
      return res.send({ 
        status: 'done', 
        result: {
          balance: balance[0].balance,
          unconfirmed: balance[0].unconfirmed
        }
      });
    }
    return res.send({ 
      status: 'error', 
      error: 'No address on this wallet'
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/fee/btc', async (req, res) => {
  name = req.body.name;
  token = req.body.walletToken;
  from_address = req.body.from_address;
  to_address = req.body.to_address;
  fee = req.body.fee;
  wallet = await Wallet.getByTickerAndName('btc', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    if (await isRecovering(wallet.name)) {
      return res.send({
        status: "recovering"
      });
    }

    return res.send({ 
      status: 'done', 
      result: fee
    });
  }
  return utils.badRequest(res);
});

module.exports = router;
