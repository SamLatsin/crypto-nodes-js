const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');

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
  // code = new Mnemonic("cradle cabin carbon soccer stumble ball ankle excuse fortune rebuild mobile collect");
  mnemonic = code.toString();

  private_key_hex = code.toHDPrivateKey(null, network).privateKey;
  private_key = new Bitcore.PrivateKey(private_key_hex, network).toWIF();

  wallet = await Wallet.getLastByTicker("btc");
  if (wallet) {
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

  res.send(
    { 
      status: 'done', 
      // debug: debug,
      // debug1: debug1,
      // debug2: debug2,
      name: name,
      mnemonic: mnemonic,
      privateKey: private_key,
      walletToken: wallet_token
    });
});

module.exports = router;
