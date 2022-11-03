const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');

const Mnemonic = require('bitcore-mnemonic');


const router = express.Router();

router.post('/api/get/status/btc', async (req, res) => {
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

router.post('/api/create/wallet/btc', async (req, res) => {
  code = new Mnemonic(Mnemonic.Words.ENGLISH);
  mnemonic = code.toString();
  private_key = code.toHDPrivateKey().privateKey.bn;
  wallet = await Wallet.getLastByTicker("btc");
  if (wallet) {
    name = 'w' + (parseInt(utils.getNumbers(wallet[0].name)[0]) + 1);
  }
  else {
    name = 'w1';
  }
  // debug = await utils.sendRpc("createwallet", [name], "bitcoin:8332/");
  // debug1 = await utils.sendRpc("sethdseed", [true, private_key], "bitcoin:8332/wallet/" + name);
  // debug2 = await utils.sendRpc("unloadwallet", [name], "bitcoin:8332/");

  fields = {
    ticker: 'btc',
    name: name,
    privateKey: private_key,
    mnemonic: mnemonic
  };

  await Wallet.insert(fields);

  res.send(
    { 
      status: 'done', 
      // debug: debug,
      // debug1: debug1,
      // debug2: debug2,
      name: name,
      mnemonic: mnemonic,
      privateKey: private_key
    });
});

module.exports = router;
