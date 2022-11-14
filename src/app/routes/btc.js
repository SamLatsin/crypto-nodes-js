const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Btc = require('../classes/btc.class');
const RecoverQueue = require('../classes/recover_queue.class');
const BtcTransaction = require('../classes/btc_transaction.class');
const Mnemonic = require('bitcore-mnemonic');
const Bitcore = require('bitcore-lib');
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

router.post('/api/walletnotify/btc', async (req, res) => {
  const txid = req.body.txid;
  const name = req.body.name;
  // await utils.sleep(2000);
  const debug1 = await utils.sendRpc("getrawtransaction", [txid], "bitcoin:8332/");
  if (debug1.error !== null) {
    return res.status(400).send({
        status: "error",
        error: debug1.error.message
    });
  }
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
      let value = parseFloat(vout.value).toFixed(8);
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
  transaction_row = await BtcTransaction.getByTxid(txid);
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
    if (to_address.length == 0) {
      return res.status(400).send({ 
        status: "error",
        result: "Bad txid or decode fail"
      });
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
  let start_height = 337122;
  let mask = "r";

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
  const debug = await utils.sendRpc("createwallet", [name, false, true, null, false, false], "bitcoin:8332/");
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

// router.post('/api/import/private_keys/btc', async (req, res) => {
//   return res.send({ 
//     status: 'done',
//   });
// });

// router.post('/api/remove/wallet/btc', async (req, res) => {
//   const name = req.body.name;
//   const debug = await utils.sendRpc("unloadwallet", [name], "bitcoin:8332/");
//   await Btc.delete(name);
//   await Wallet.delete(name);
//   const fs = require('fs');

//   return res.send({ 
//     status: 'done', 
//   });
// });

module.exports = router;
