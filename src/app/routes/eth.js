const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Eth = require('../classes/eth.class');
const Web3 = require('web3')
const ethTx = require('@ethereumjs/tx').Transaction
const router = express.Router();

let network = "";
let service = "";
let contract = "";
let decimals = 0;
let chainId = 0;
if (process.env.ETH_TESTNET == 1) {
  network = "sepolia";
  service = "geth-sepolia:8545";
  contract = "0x91B333A8485737f9B93327483030f48526FaDc22"; // testnet erc20 token
  decimals = 1e18;
  chainId = 11155111;
}
else {
  network = "mainnet";
  service = "geth:8545";
  contract = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  decimals = 1e6;
  chainId = 1;
}

async function createTx(addressFrom, addressTo, valueInEther, privKey, memo) {
  var provider = 'http://' + service;
  var web3 = new Web3(new Web3.providers.HttpProvider(provider))
  web3.transactionConfirmationBlocks = 1;
  privKey = Buffer.from(privKey.slice(2), 'hex'); // Exclude 0x at the beginning of the private key
  let txnCount = await web3.eth.getTransactionCount(addressFrom, "pending");
  let gasPrice = await web3.eth.getGasPrice();
  var txObject = {
      'chainId': chainId,
      'nonce': web3.utils.numberToHex(txnCount),
      'to': addressTo,
      'gasPrice': web3.utils.numberToHex(gasPrice),
      'gasLimit': web3.utils.numberToHex(70000),
      'value': web3.utils.numberToHex(web3.utils.toWei(valueInEther.toString(), 'ether')),
      'type': 2,
  };
  if (memo) {
    txObject.data = web3.utils.utf8ToHex(memo)
  }
  const tx = new ethTx(txObject, { chain: network})
  tx.sign(privKey)
  var serializedTx = tx.serialize();
  var rawTxHex = '0x' + serializedTx.toString('hex');
  return rawTxHex;
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

router.post('/api/get/balance/eth', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  let wallet = await Wallet.getByTickerAndName('eth', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    let address = await Eth.getByName(wallet.name);
    address = address[0].address;
    let args = [address, "latest"];
    let result = await utils.sendRpcEth("eth_getBalance", args, service);
    const balance = parseFloat(Number(result.result)) / 1e18;
    address = address.substring(2);
    data = "0x70a08231" + address.padStart(64, 0); // balanceOf(address)
    args = {
      to: contract,
      data: data
    };
    result = await utils.sendRpcEth("eth_call", [args, "latest"], service);
    const tokens = parseFloat(Number(result.result)) / decimals;
    return res.send({ 
      status: 'done', 
      name: name,
      balance: balance,
      tokens: isNaN(tokens) ? 0 : tokens,
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/fee/eth', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  const amount = req.body.amount;
  const to_address = req.body.address;
  let wallet = await Wallet.getByTickerAndName('eth', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    const gas_price = await utils.sendRpcEth("eth_gasPrice", [], service);
    const fee = parseFloat(Number(gas_price.result)) / 1e18 * 21000;
    return res.send({ 
      status: 'done', 
      fee: fee
    });
  }
  return utils.badRequest(res);
});

router.post('/api/send/eth', async (req, res) => {
  const name = req.body.name;
  const token = req.body.walletToken;
  const amount = req.body.amount;
  const to_address = req.body.address;
  const memo = req.body.memo;
  let wallet = await Wallet.getByTickerAndName('eth', name);
  if (wallet && wallet.length !== 0) {
    wallet = wallet[0];
    if (wallet.walletToken != token) {
      return utils.badToken(res);
    }
    let from_address = await Eth.getByName(wallet.name);
    from_address = from_address[0].address;
    let result = await createTx(from_address, to_address, amount, wallet.privateKey, memo);
    result = await utils.sendRpcEth("eth_sendRawTransaction", [result], service);
    if ("error" in result) {
      return res.status(400).send({ 
        status: 'error', 
        error: result.error.message
      });
    }
    return res.send({ 
      status: 'done', 
      result: result
    });
  }
  return utils.badRequest(res);
});

router.post('/api/wallet/recover/eth', async (req, res) => {
  const mnemonic = req.body.mnemonic;
  const private_key = req.body.privateKey;
  const wallet = await Wallet.getLastByTicker("eth");
  if (wallet && wallet.length !== 0) {
    name = 'rw' + (parseInt(utils.getNumbers(wallet[0].name)[0]) + 1);
  }
  else {
    name = 'rw1';
  }
  data = generateWallet(mnemonic, private_key);
  if (!mnemonic) {
    data.mnemonic = null;
  }
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
    walletToken: wallet_token,
  });
});

// router.post('/api/test/eth', async (req, res) => {
//   const name = req.body.name;
//   return res.send({ 
//     status: 'done',
//     name: name
//   });
// });



module.exports = router;