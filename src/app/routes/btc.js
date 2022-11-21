const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Btc = require('../classes/btc.class');
const RecoverQueue = require('../classes/recover_queue.class');
const BtcTransaction = require('../classes/btc_transaction.class');
const Mnemonic = require('bitcore-mnemonic');
const Bitcore = require('bitcore-lib');
const multer = require('multer');
const upload = multer();
// const upload = multer({ dest: '../uploads/' });
const router = express.Router();

let network = "";
if (process.env.BTC_TESTNET == 1) {
  network = "testnet";
}
else {
  network = "livenet";
}

async function isRecovering(name) {
  let debug1 = await utils.sendRpc("loadwallet", [name], "bitcoin:8332/");
  let result = await utils.sendRpc("getwalletinfo", [], "bitcoin:8332/wallet/" + name);
  if (result.result == null) { 
    return true; // maybe need to change this
  }
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

async function getConfirmations(txid) {
  if (!txid || txid.length == 0) {
    return 1;
  }
  raw_transaction = await utils.sendRpc("getrawtransaction", [txid, 1], "bitcoin:8332/");
  if ("confirmations" in raw_transaction.result) {
    confirmations = raw_transaction.result.confirmations;
  }
  else {
    confirmations = 0;
  }
  return confirmations;
}

async function updateBalance(name) {
  if (!name || name.length == 0) {
    return;
  }
  let transactions = await BtcTransaction.getToSync(name);
  let addresses = await Btc.getByName(name);
  for (const [key, transaction] of Object.entries(transactions)) {
    let fee = transaction.fee;
    let key1 = addresses.findIndex(address => address.address === transaction.fromAddress);
    if (key1 !== -1) {
      if (name == transaction.fromWallet) {
        if (transaction.fromWallet == transaction.toWallet) {
          transactions[key].toChecks = 2;
          transactions[key].fromChecks = 2;
          addresses[key1].balance = (parseFloat(addresses[key1].balance) - parseFloat(transaction.amount) - parseFloat(fee)).toFixed(8);
          key1 = addresses.findIndex(address => address.address === transaction.toAddress);
          addresses[key1].balance = (parseFloat(addresses[key1].balance) + parseFloat(transaction.amount)).toFixed(8);
        }
        else {
          if (transaction.fromChecks == 1 && await getConfirmations(transaction.txid) > 0) {
            transactions[key].fromChecks = 2;
          }
          if (transaction.fromChecks == 0) {
            addresses[key1].balance = (parseFloat(addresses[key1].balance) - parseFloat(transaction.amount) - parseFloat(fee)).toFixed(8);
            transactions[key].fromChecks = 1;
          }
        }
      }
    }
    else {
      let key1 = addresses.findIndex(address => address.address === transaction.toAddress);
      if (key1 !== -1) {
        if (name == transaction.toWallet) {
          if (transaction.toChecks == 1) {
            if (await getConfirmations(transaction.txid) > 0) {
              addresses[key1].balance = (parseFloat(addresses[key1].balance) + parseFloat(transaction.amount)).toFixed(8);
              addresses[key1].unconfirmed = (parseFloat(addresses[key1].unconfirmed) - parseFloat(transaction.amount)).toFixed(8);
              transactions[key].toChecks = 2;
            }
          }
          if (transaction.toChecks == 0) {
            if (await getConfirmations(transaction.txid) > 0) {
              addresses[key1].balance = (parseFloat(addresses[key1].balance) + parseFloat(transaction.amount)).toFixed(8);
              transactions[key].toChecks = 2;
            }
            else {
              addresses[key1].unconfirmed = (parseFloat(addresses[key1].unconfirmed) + parseFloat(transaction.amount)).toFixed(8);
              transactions[key].toChecks = 1;
            }
          }
        }
      }
    }
    if (transaction.fromWallet == null) {
      transactions[key].fromChecks = transactions[key].toChecks;
    }
    if (transaction.toWallet == null) {
      transactions[key].toChecks = transactions[key].fromChecks;
    }
    await BtcTransaction.update(transactions[key], transactions[key].id);
  }
  for (const [key, address] of Object.entries(addresses)) {
    await Btc.update(address, address.id)
  }
  return true;
}

router.post('/api/get/status/btc', async (req, res) => {
  let result = await utils.sendRpc("getblockchaininfo", [], "bitcoin:8332/");
  if (result) {
    result = result.result;
  }
  return res.send({ 
    status: 'done', 
    result: result,
  });
});

router.post('/api/create/wallet/btc', async (req, res) => {
  const code = new Mnemonic(Mnemonic.Words.ENGLISH);
  // code = new Mnemonic("cradle cabin carbon soccer stumble ball ankle excuse fortune rebuild mobile collect");
  const mnemonic = code.toString();
  const private_key_hex = code.toHDPrivateKey(null, network).privateKey;
  const private_key = new Bitcore.PrivateKey(private_key_hex, network).toWIF();
  const wallet = await Wallet.getLastByTicker("btc");
  if (wallet && wallet.length !== 0) {
    name = 'w' + (parseInt(utils.getNumbers(wallet[0].name)[0]) + 1);
  }
  else {
    name = 'w1';
  }
  const debug = await utils.sendRpc("createwallet", [name, false, true, null, false, false], "bitcoin:8332/");
  const debug1 = await utils.sendRpc("sethdseed", [true, private_key], "bitcoin:8332/wallet/" + name);
  const debug2 = await utils.sendRpc("unloadwallet", [name], "bitcoin:8332/");
  const wallet_token = utils.generateUUID();
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
  const name = req.body.name;
  const token = req.body.walletToken;
  let wallet = await Wallet.getByTickerAndName('btc', name);
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
    const debug1 = await utils.sendRpc("loadwallet", [wallet.name], "bitcoin:8332/");
    const debug2 = await utils.sendRpc("getwalletinfo", [], "bitcoin:8332/wallet/" + name);
    const balance = debug2.result.balance;
    const unconfirmed_balance = debug2.result.unconfirmed_balance;
    const immature_balance = debug2.result.immature_balance;
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
  const name = req.body.name;
  const token = req.body.walletToken;
  let wallet = await Wallet.getByTickerAndName('btc', name);
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
    const debug1 = await utils.sendRpc("loadwallet", [wallet.name], "bitcoin:8332/");
    const debug2 = await utils.sendRpc("getnewaddress", [], "bitcoin:8332/wallet/" + name);
    const address = debug2.result;
    let fields = {
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
  const name = req.body.name;
  const token = req.body.walletToken;
  let wallet = await Wallet.getByTickerAndName('btc', name);
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
    const addresses_raw = await Btc.getByName(name);
    let addresses = [];
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
  const name = req.body.name;
  const token = req.body.walletToken;
  const address = req.body.address;
  let wallet = await Wallet.getByTickerAndName('btc', name);
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
    const balance = await Btc.getByNameAndAddress(name, address);
    if (balance && balance.length !== 0) {
      return res.send({ 
        status: 'done', 
        result: {
          balance: balance[0].balance,
          unconfirmed: balance[0].unconfirmed
        }
      });
    }
    return res.status(400).send({ 
      status: 'error', 
      error: 'No address on this wallet'
    });
  }
  return utils.badRequest(res);
});

async function forwardBalance(name) {
  const amount = await utils.sendRpc("getbalance", [], "bitcoin:8332/wallet/" + name);
  const args = {
    address: process.env.BTC_FORWARD_ADDRESS,
    amount: amount.result,
    subtractfeefromamount: true
  };
  const result = await utils.sendRpc("sendtoaddress", args, "bitcoin:8332/wallet/" + name);
  return result;
}

router.post('/api/walletnotify/btc', async (req, res) => {
  const txid = req.body.txid;
  const name = req.body.name;
  if (name.startsWith("rw")) {
    let wallet = await Wallet.getByTickerAndName("btc", name);
    wallet = wallet[0];
    if (wallet.recovered == 0) {
      return res.status(400).send({ 
        status: "error",
        result: "wallet is not fully recovered"
      });
    }
  }
  if (name.startsWith("frw")) {
    let wallet = await Wallet.getByTickerAndName("btc", name);
    wallet = wallet[0];
    if (wallet.recovered == 0) {
      return res.status(400).send({ 
        status: "error",
        result: "wallet is not fully recovered"
      });
    }
    let result = await forwardBalance(name);
    return res.send({ 
      status: "done",
      operation: "forward balance",
      result: result
    });
  }
  // await utils.sleep(2000);
  const debug1 = await utils.sendRpc("getrawtransaction", [txid], "bitcoin:8332/");
  if (debug1.error !== null) {
    return res.status(400).send({
        status: "error",
        error: debug1.error.message
    });
  }
  let value = 0;
  let raw_transaction = debug1.result;
  const debug2 = await utils.sendRpc("decoderawtransaction", [raw_transaction], "bitcoin:8332/");
  let transaction = debug2.result;
  let to_address = null;
  let minus = parseFloat(0);
  for (const [key, vout] of Object.entries(transaction.vout)) {
    minus = (parseFloat(minus) + parseFloat(vout.value)).toFixed(8);
    address = vout.scriptPubKey.address;
    address = await Btc.getByAddress(address);
    if (address && address.length !== 0) {
      value = parseFloat(vout.value).toFixed(8);
      to_address = address;
    }
  }
  let plus = parseFloat(0);
  let from_address = null;
  let from_address_raw = null;
  for (const [key, vin] of Object.entries(transaction.vin)) {
    let vout_id = vin.vout;
    let debug1 = await utils.sendRpc("getrawtransaction", [vin.txid], "bitcoin:8332/");
    let raw_transaction = debug1.result;
    let debug2 = await utils.sendRpc("decoderawtransaction", [raw_transaction], "bitcoin:8332/");
    let transaction = debug2.result;
    for (const [key, vout] of Object.entries(transaction.vout)) {
      if (vout_id == vout.n) {
        from_address_raw = vout.scriptPubKey.address;
        address = await Btc.getByAddress(address);
        if (address && address.length !== 0) {
          from_address = address;
        }
        plus = (parseFloat(plus) + parseFloat(vout.value)).toFixed(8);
      }
    }
  }
  let fee = parseFloat(parseFloat(plus) - parseFloat(minus)).toFixed(8);
  // transaction_row = await BtcTransaction.getByTxid(txid);
  transaction_row = await BtcTransaction.getByNameAndTxid(name, txid);
  let upd = false;
  if (transaction_row && transaction_row.length !== 0) {
    upd = true;
  }
  if (upd) {
    fields = {
      fee: fee,
      checks: transaction_row[0].checks + 1
    };
    await BtcTransaction.update(fields, transaction_row[0].id);
  }
  else {
    if (typeof value == 'undefined') {
      return res.status(400).send({ 
        status: "error",
        result: "Bad txid or decode fail"
      });
    }
    if (to_address != null) {
      if (to_address.length == 0) {
        return res.status(400).send({ 
          status: "error",
          result: "Bad txid or decode fail"
        });
      }
    }
    let to_wallet = await Btc.getByAddress(to_address[0].address);
    let name = null; // unknown wallet
    if (to_wallet && to_wallet.length !== 0) {
      name = to_wallet[0].name;
    }
    let from_wallet = null;
    if (from_address && from_address.length !== 0) {
      from_wallet = await Btc.getByAddress(from_address[0].address);
    }
    let from_wallet_name = null; // unknown wallet
    if (from_wallet && from_wallet.length !== 0) {
      from_wallet_name = from_wallet[0].name;
    }
    fields = {
      toWallet: name,
      fromWallet: from_wallet_name,
      fromAddress: from_address_raw,
      toAddress: to_address[0].address,
      amount: value,
      txid: txid,
      fee: fee,
      checks: 1
    };
    if (value) {
      await BtcTransaction.insert(fields);
    }
  }
  return res.send({ 
    status: "done",
    fields: fields,
    plus: plus,
    minus: minus 
  });
});

router.post('/api/get/history/btc', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  let wallet = await Wallet.getByTickerAndName('btc', name);
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
    const transactions = await BtcTransaction.getByName(name);
    return res.send({ 
      status: 'done', 
      result: transactions
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/fee/btc', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  const from_address = req.body.from_address;
  const to_address = req.body.to_address;
  let fee = req.body.fee;
  let amount = req.body.amount;
  let wallet = await Wallet.getByTickerAndName('btc', name);
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
    const from_virtual = await Btc.getByNameAndAddress(name, from_address);
    if (!from_virtual || from_virtual.length == 0) {
      return res.status(400).send({ 
        status: 'error', 
        result: 'Non-existent address on this wallet'
      });
    }
    const to_virtual = await Btc.getByNameAndAddress(name, to_address);
    if (to_virtual && to_virtual.length > 0) {
      if (from_virtual[0].name == to_virtual[0].name) {
        if (parseFloat(from_virtual[0].balance) >= parseFloat(amount)) {
          return res.send({ 
            status: 'done', 
            result: 0
          });
        }
        return res.status(400).send({ 
          status: 'error', 
          result: 'Insufficient funds'
        });
      }
    }
    const load = await utils.sendRpc("loadwallet", [wallet.name], "bitcoin:8332/");
    amount = parseFloat(amount).toFixed(8);
    const args = [
      [],
      [
        {
          [to_address]: amount
        }
      ]
    ];
    const hex = await utils.sendRpc("createrawtransaction", args, "bitcoin:8332/");
    if (fee && fee.length > 0) {
      fee = parseFloat(fee) / 1e5; // convert from BTC/kB to satoshis/byte
      result = await utils.sendRpc("fundrawtransaction", [hex.result, {feeRate: fee}], "bitcoin:8332/wallet/" + name);
    }
    else {
      result = await utils.sendRpc("fundrawtransaction", [hex.result], "bitcoin:8332/wallet/" + name);
    }
    if (result.error !== null) {
      return res.status(400).send({
          status: "error",
          error: result.error.message
      });
    }
    return res.send({ 
      status: 'done', 
      result: result.result.fee
    });
  }
  return utils.badRequest(res);
});

router.post('/api/send/btc', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  const from_address = req.body.from_address;
  const to_address = req.body.to_address;
  let fee = req.body.fee;
  let amount = req.body.amount;
  let wallet = await Wallet.getByTickerAndName('btc', name);
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
    const from_virtual = await Btc.getByNameAndAddress(name, from_address);
    if (!from_virtual || from_virtual.length == 0) {
      return res.status(400).send({ 
        status: 'error', 
        result: 'Non-existent address on this wallet'
      });
    }
    const to_virtual = await Btc.getByNameAndAddress(name, to_address);
    if (to_virtual && to_virtual.length > 0) {
      if (from_virtual[0].name == to_virtual[0].name) {
        if (parseFloat(from_virtual[0].balance) >= parseFloat(amount)) {
          const fields = {
            fromWallet: name,
            toWallet: name,
            fromAddress: from_virtual[0].address,
            toAddress: to_address[0].address,
            amount: amount,
            fee: 0,
            checks: 2,
          };
          await BtcTransaction.insert(fields);
          await updateBalance(name);
          return res.send({ 
            status: 'done', 
            result: null
          });
        }
        return res.status(400).send({ 
          status: 'error', 
          result: 'Insufficient funds'
        });
      }
    }
    amount = parseFloat(amount).toFixed(8);
    if (fee && fee.length > 0) {
      args = {
        address: to_address,
        amount: amount,
        fee_rate: fee
      };
    }
    else {
      args = {
        address: to_address,
        amount: amount,
        conf_target: 3
      };
    }
    if (parseFloat(from_virtual[0].balance) < parseFloat(amount)) {
      return res.status(400).send({ 
        status: 'error', 
        result: 'Insufficient funds'
      });
    }
    const load = await utils.sendRpc("loadwallet", [wallet.name], "bitcoin:8332/");
    const result = await utils.sendRpc("sendtoaddress", args, "bitcoin:8332/wallet/" + name);
    if (result.error !== null) {
      return res.status(400).send({
          status: "error",
          error: result.error.message
      });
    }
    let to_wallet = await Btc.getByAddress(to_address);
    if (to_wallet && to_wallet.length > 0) {
      to_wallet = to_wallet[0].name;
    }
    else {
      to_wallet = null;
    }
    fields = {
      fromWallet: name,
      toWallet: to_wallet,
      fromAddress: from_address,
      toAddress: to_address,
      amount: amount,
      txid: result.result
    };
    await BtcTransaction.insert(fields);
    return res.send({ 
      status: 'done', 
      result: result.result
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/confirmations/btc', async (req, res) => {
  const txid = req.body.txid;
  return res.send({ 
    status: 'done', 
    result: await getConfirmations(txid)
  });
});

router.post('/api/walelt/get/transaction/btc', async (req, res) => {
  const txid = req.body.txid;
  const result = await utils.sendRpc("getrawtransaction", [txid, 1], "bitcoin:8332/");
  if (result.error !== null) {
    return res.status(400).send({
        status: "error",
        error: result.error.message
    });
  }
  return res.send({ 
    status: 'done', 
    result: result.result
  });
});

router.post('/api/wallet/recover/btc', async (req, res) => {
  let start_height = 0;
  let mask = "fr";
  let frw = req.body.frw;
  if (!frw) {
    start_height = 337122;
    mask = "r";
  }

  let mnemonic = req.body.mnemonic;
  let private_key = req.body.private_key;

  if (!private_key && !mnemonic) {
    return res.status(400).send({
        status: "error",
        error: "No mnemonic or private key"
    });
  }
  if (mnemonic) {
    let code = new Mnemonic(mnemonic);
    mnemonic = code.toString();
    const private_key_hex = code.toHDPrivateKey(null, network).privateKey;
    private_key = new Bitcore.PrivateKey(private_key_hex, network).toWIF();
  }
  else {
    mnemonic = null;
  }
  const wallet = await Wallet.getLastByTicker("btc");
  if (wallet && wallet.length !== 0) {
    name = mask + 'w' + (parseInt(utils.getNumbers(wallet[0].name)[0]) + 1);
  }
  else {
    name = mask + 'w1';
  }
  let debug = null;
  if (mask == "fr") {
    debug = await utils.sendRpc("createwallet", [name, false, true, null, false, false, true], "bitcoin:8332/");
  }
  else {
    debug = await utils.sendRpc("createwallet", [name, false, true, null, false, false], "bitcoin:8332/");
  }
  const debug1 = await utils.sendRpc("sethdseed", [true, private_key], "bitcoin:8332/wallet/" + name);
  const wallet_token = utils.generateUUID();
  let fields = {
    ticker: 'btc',
    name: name,
    privateKey: private_key,
    mnemonic: mnemonic,
    walletToken: wallet_token
  };
  await Wallet.insert(fields);
  fields = {
    ticker: 'btc',
    name: name,
    startHeight: start_height
  };
  await RecoverQueue.insert(fields);
  return res.send({ 
    status: 'done', 
    name: name,
    mnemonic: mnemonic,
    privateKey: private_key,
    walletToken: wallet_token
    // debug: debug,
    // debug1: debug1,
  });
});

router.post('/api/wallet/recover/status/btc', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  let wallet = await Wallet.getByTickerAndName('btc', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    const load = await utils.sendRpc("loadwallet", [wallet.name], "bitcoin:8332/");
    let result = await utils.sendRpc("getwalletinfo", [], "bitcoin:8332/wallet/" + wallet.name);
    if (result.error !== null) {
      return res.status(400).send({
          status: "error",
          error: result.error.message
      });
    }
    if (result.result.scanning == false) {
      return res.send({ 
        status: 'done'
      });
    }
    result = result.result.scanning
    return res.send({ 
      status: 'syncing',
      progress: parseFloat(result.progress) * 100,
      duration: result.duration
    });
  }
  return utils.badRequest(res);
});

router.post('/api/remove/wallet/btc', async (req, res) => {
  const name = req.body.name;
  const wallet = await Wallet.getByTickerAndName('btc', name);
  if (wallet.length > 0) {
    await Wallet.delete(wallet[0].id);
  }
  const debug = await utils.sendRpc("unloadwallet", [name], "bitcoin:8332/");
  await Btc.deleteByName(name);
  await RecoverQueue.deleteByTickerAndName("btc", name);
  let dir = "";
  if (network == "testnet") {
    dir = "/root/bitcoin-data/testnet3/wallets/";
  }
  else {
    dir = "/root/bitcoin-data/";
  }
  const fs = require('fs');
  fs.rm(dir + name, { recursive: true, force: true }, (error) => {
    return res.send({ 
      status: 'done', 
      error: error
    });
  });
});

async function getDuplicate(key) {
  let mnemonic = null;
  let private_key = null;
  if (key.split(" ").length > 3) {
    mnemonic = key;
    let code = new Mnemonic(mnemonic);
    mnemonic = code.toString();
    const private_key_hex = code.toHDPrivateKey(null, network).privateKey;
    private_key = new Bitcore.PrivateKey(private_key_hex, network).toWIF();
  }
  else {
    private_key = key;
  }
  let duplicate = await Wallet.getByTickerAndKey("btc", private_key);
  if (duplicate && duplicate.length > 0) {
    if (duplicate.length == 1) {
      if (duplicate[0].name[0] == "f") {
        duplicate = {
          name: duplicate[0].name,
          mnemonic: duplicate[0].mnemonic,
          privateKey: duplicate[0].privateKey
        };
        return duplicate;
      }
    }
    else {
      for (const [key, wallet] of Object.entries(duplicate)) {
        if (wallet.name[0] == "f") {
          duplicate = {
            name: wallet.name,
            mnemonic: wallet.mnemonic,
            privateKey: wallet.privateKey
          };
          return duplicate;
        }
      }
    }
  }
  return {
    name: null,
    mnemonic: mnemonic,
    privateKey: private_key
  }; 
}

router.post('/api/import/private_keys/btc', upload.single('file'), async (req, res) => {
  if (!utils.checkToken(req)) {
    return res.status(400).send({
      "status": "error",
      "error": "Bad Request"
    });
  }
  let list = req.body.list;
  let file= req.file;
  let names = [];
  let duplicates = [];
  let bads = [];
  let dup = null;
  let iterables = [];
  if (list) {
    iterables.push(list);
  }
  if (file) {
    const fs = require('fs');
    let data = file.buffer.toString().split(/(?:\r\n|\r|\n)/g);
    iterables.push(data);
  }
  for (const [index, iterable] of Object.entries(iterables)) {
    for (let [key, line] of Object.entries(iterable)) {
      line = line.split(" ");
      if ((line.length <= 1 && line[0].length > 34) || line.length >= 3) {
        if (line.length > 3) {
          line = line.join(" ");
          dup = await getDuplicate(line); // recover wallet from 0 height with "fr" by mnemonic
          // console.log(line);
        }
        else {
          if (line[0].length > 34) {
            line = line[0];
            dup = await getDuplicate(line); // recover wallet from 0 height with "fr" by private_key
            // console.log(line);
          }
          else {
            bads.push(line.join(" "));
          }
        }
        let recovered_info = null;
        if (dup.name == null) {
          let body = {
            token: process.env.BTC_TOKEN,
            mnemonic: dup.mnemonic,
            private_key: dup.privateKey,
            frw: 1
          }
          recovered_info = await utils.sendLocal("/api/wallet/recover/btc", body);
        }
        else {
          duplicates.push(dup);
        }
        if (recovered_info != null) {
          if (("status" in recovered_info) && ("privateKey" in recovered_info)) {
            if (recovered_info.status == "error") {
              bads.push(dup);
            }
            if (("name" in recovered_info) && recovered_info.status == "done") {
              names.push(recovered_info.name);
            }
          }
        }

      }
      else {
        bads.push(line.join(" "));
      }
    }
  }
  return res.send({ 
    status: 'done',
    message: "private keys imported",
    bads: bads,
    duplicates: duplicates,
    names: names.reverse()
  });
});

router.post('/api/get/file_recovered/stats/btc', async (req, res) => {
  let wallets = await Wallet.getImported("btc");
  let result = [];
  for (let [key, wallet] of Object.entries(wallets)) {
    let item = await RecoverQueue.getByTickerAndName("btc", wallet.name);
    let scan = null;
    let status = "";
    let addresses = [];

    if (!item || item.length == 0) {
      status = "recovered";
      let addresses_raw = await Btc.getByName(wallet.name);
      for (const element of addresses_raw) {
        addresses.push(element.address);
      }
    }
    else {
      if (item[0].recovering == 1) {
        status = "recovering";
      }
      else {
        status = "in queue";
      }
      scan = await utils.sendRpc("getwalletinfo", [], "bitcoin:8332/wallet/" + wallet.name);
      scan = scan.result.scanning;
      if (scan) {
        scan = {
          progress: parseFloat(scan.progress) * 100,
          duration: scan.duration
        };
      }
    }
    let fields = {
      name: wallet.name,
      status: status,
      recoverStatus: scan,
      lastSync: wallet.lastSync,
      addresses: addresses
    };
    result.push(fields);
  }
  return res.send({ 
    status: 'done',
    result: result
  });
});

// https://stackoverflow.com/questions/38493893/heres-how-to-send-raw-transaction-btc-using-bitcoin-cli-command
router.post('/api/send_raw/btc', async (req, res) => { 
  const token = req.body.walletToken;
  const name = req.body.name;
  let inputs_raw = req.body.inputs;
  let outputs_raw = req.body.outputs;
  let fee = req.body.fee;
  if (!fee) {
    fee = 1;
  }
  let wallet = await Wallet.getByTickerAndName('btc', name);
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
    inputs_raw = JSON.parse(inputs_raw);
    outputs_raw = JSON.parse(outputs_raw);
    let inputs = [];
    const load = await utils.sendRpc("loadwallet", [wallet.name], "bitcoin:8332/");
    const listunspent = await utils.sendRpc("listunspent", [], "bitcoin:8332/wallet/" + wallet.name);
    const new_address = await utils.sendRpc("getrawchangeaddress", [], "bitcoin:8332/wallet/" + wallet.name);
    let max = 0;
    for (const [key, unspent] of Object.entries(listunspent.result)) {
      for (const [key, input_raw] of Object.entries(inputs_raw)) {
        if (input_raw == unspent.address) {
          if (max == 0) {
            max = unspent.amount
          }
          if (unspent.amount > max) {
            max = unspent.amount;
          }
          inputs.push({
            txid: unspent.txid,
            vout: unspent.vout
          });
        }
      }
    }
    let args = [inputs, outputs_raw];
    let raw_transaction = await utils.sendRpc("createrawtransaction", args, "bitcoin:8332/");
    if (raw_transaction.result == null) {
      return res.status(400).send({ 
        status: 'error', 
        command: 'createrawtransaction',
        error: raw_transaction.error.message
      });
    }
    let sum = 0;
    for (const [key, output] of Object.entries(outputs_raw)) {
      for (const key1 in output) {
        sum = sum + parseFloat(output[key1]);
      }
    }
    sum = sum.toFixed(8);
    fee = parseFloat(raw_transaction.result.length * fee / 1e8).toFixed(8);
    outputs_raw.push({
      [new_address.result]: (max - parseFloat(fee) - parseFloat(sum)).toFixed(8)
    });
    args = [inputs, outputs_raw];
    raw_transaction = await utils.sendRpc("createrawtransaction", args, "bitcoin:8332/");
    if (raw_transaction.result == null) {
      return res.status(400).send({ 
        status: 'error', 
        command: 'createrawtransaction',
        error: raw_transaction.error.message
      });
    }
    const signed_transaction = await utils.sendRpc("signrawtransactionwithwallet", [raw_transaction.result], "bitcoin:8332/wallet/" + wallet.name);
    if (signed_transaction.result == null) {
      return res.status(400).send({ 
        status: 'error', 
        command: 'signrawtransactionwithwallet',
        error: signed_transaction.error.message
      });
    }
    const send_raw_transaction = await utils.sendRpc("sendrawtransaction", [signed_transaction.result.hex], "bitcoin:8332/");
    if (send_raw_transaction.result == null) {
      return res.status(400).send({ 
        status: 'error', 
        command: 'sendrawtransaction',
        error: send_raw_transaction.error.message
      });
    }
    const result = send_raw_transaction.result;
    return res.send({ 
      status: 'done', 
      result: result,
      // listunspent: listunspent,
      // inputs: inputs,
      // outputs: outputs_raw,
      // raw_transaction: raw_transaction,
      // signed_transaction: signed_transaction,
      // send_raw_transaction: send_raw_transaction,
      // new_address: new_address,
      // fee: fee
    });
  }
  return utils.badRequest(res);
});

// router.post('/api/test/btc', async (req, res) => {
//   const name = req.body.name;
//   const result = await utils.sendRpc("-getinfo", [], "bitcoin:8332/");
//   // await forwardBalance(name);
//   return res.send({ 
//     status: 'done',
//     result: result
//   });
// });

module.exports = router;
