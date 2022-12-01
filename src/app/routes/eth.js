const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Eth = require('../classes/eth.class');
const router = express.Router();


let network = "";
let service = "";
if (process.env.ETH_TESTNET == 1) {
  network = "sepolia";
  service = "geth-sepolia:8545"
}
else {
  network = "mainnet";
  service = "geth:8545";
}

function generateWallet(mnemonic = null, private_key = null) {
  if (!mnemonic) {
      mnemonic = require("bip39").generateMnemonic();
  }
  const HDWallet = require('ethereum-hdwallet');
  const hdwallet = HDWallet.fromMnemonic(mnemonic);
  if (!private_key) {
    private_key = hdwallet.derive(`m/44'/60'/0'/0/0`).getPrivateKey().toString('hex');
    address = hdwallet.derive(`m/44'/60'/0'/0/0`).getAddress().toString('hex');
    private_key = `0x${private_key}`;
    address = `0x${address}`;
  }
  else {
    const privateKeyToAddress = require('ethereum-private-key-to-address');
    address = privateKeyToAddress(Buffer.from(private_key.slice(2), 'hex')).toLowerCase();
  }
  const res = {
    "mnemonic": mnemonic,
    "privateKey": private_key,
    "address": address
  };
  return res;
}

router.post('/api/get/status/eth', async (req, res) => {
  let result = await utils.sendRpcEth("eth_syncing", [], service);
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

router.post('/api/create/wallet/eth', async (req, res) => {
  const wallet = await Wallet.getLastByTicker("eth");
  if (wallet && wallet.length !== 0) {
    name = 'w' + (parseInt(utils.getNumbers(wallet[0].name)[0]) + 1);
  }
  else {
    name = 'w1';
  }
  data = generateWallet();
  const wallet_token = utils.generateUUID();
  let fields = {
    ticker: 'eth',
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
  await Eth.insert(fields);
  return res.send({ 
    status: 'done', 
    name: name,
    mnemonic: data.mnemonic,
    privateKey: data.privateKey,
    walletToken: wallet_token
  });
});

router.post('/api/get/address/eth', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  let wallet = await Wallet.getByTickerAndName('eth', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    const address = await Eth.getByName(wallet.name);
    return res.send({ 
      status: 'done', 
      address: address[0].address,
    });
  }
  return utils.badRequest(res);
});

router.post('/api/test/eth', async (req, res) => {
  const name = req.body.name;
  return res.send({ 
    status: 'done',
    name: name
  });
});

module.exports = router;