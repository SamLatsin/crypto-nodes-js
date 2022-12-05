const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Eth = require('../classes/eth.class');
const Web3 = require('web3')
const ethTx = require('@ethereumjs/tx').Transaction
const Chain = require('@ethereumjs/common').Chain;
const Common = require('@ethereumjs/common').Common;
const Hardfork = require('@ethereumjs/common').Hardfork;
const router = express.Router();

let network = "";
let service = "";
let contract = "";
let decimals = 0;
let chain = null;
if (process.env.ETH_TESTNET == 1) {
  network = "sepolia";
  service = "geth-sepolia:8545";
  contract = "0x8964C0EFFB160041bdF9D0385d6a42f48Ce3Ef4f"; // testnet erc20 token
  decimals = 1e18;
  chain = Chain.Sepolia;
}
else {
  network = "mainnet";
  service = "geth:8545";
  contract = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  decimals = 1e6;
  chain = Chain.Mainnet;
}

async function createTx(addressFrom, addressTo, valueInEther, privKey, memo) {
  let provider = 'http://' + service;
  let web3 = new Web3(new Web3.providers.HttpProvider(provider))
  web3.transactionConfirmationBlocks = 1;
  chainId = await web3.eth.net.getId();
  privKey = Buffer.from(privKey.slice(2), 'hex'); // Exclude 0x at the beginning of the private key
  let txnCount = await web3.eth.getTransactionCount(addressFrom, "pending");
  let gasPrice = await web3.eth.getGasPrice();
  let txObject = {
      // 'chainId': web3.utils.numberToHex(chainId),
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
  const common = new Common({ chain: chain });
  let tx = new ethTx(txObject, {common})
  tx = tx.sign(privKey);
  let serializedTx = tx.serialize();
  let rawTxHex = '0x' + serializedTx.toString('hex');
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

// async function getHistory(address) {
//   let provider = 'http://' + service;
//   let web3 = new Web3(new Web3.providers.HttpProvider(provider))
//   let currentBlock = await web3.eth.getBlockNumber();
//   let n = await web3.eth.getTransactionCount(address, currentBlock);
//   let bal = await web3.eth.getBalance(address, currentBlock);
//   console.log(bal);
//   console.log(n);
//   console.log(currentBlock);

//   for (let i=currentBlock; i >= 0 && (n > 0 || bal > 0); --i) {
//       try {
//           let block = await web3.eth.getBlock(i, true);
//           // console.log(i);
//           // console.log(block);
//           if (block && block.transactions) {
//               block.transactions.forEach(function(e) {
//                   if (address == e.from) {
//                       if (e.from != e.to)
//                           bal = bal.plus(e.value);
//                       console.log(i, e.from, e.to, e.value.toString(10));
//                       --n;
//                   }
//                   if (address == e.to) {
//                       if (e.from != e.to)
//                           bal = bal.minus(e.value);
//                       console.log(i, e.from, e.to, e.value.toString(10));
//                   }
//               });
//           }
//       } catch (e) { console.error("Error in block " + i, e); }
//   }
// }

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
    console.log(result);
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
      result: fee.toFixed(8)
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
      txHash: result.result
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

router.post('/api/get/history/eth', async (req, res) => {
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
    // result = await getHistory(address);
    

    return res.send({ 
      status: 'done', 
      name: name,
      // result: result
    });
  }
  return utils.badRequest(res);
});

// router.post('/api/test/eth', async (req, res) => {
//   const name = req.body.name;
//   return res.send({ 
//     status: 'done',
//     name: name
//   });
// });



module.exports = router;