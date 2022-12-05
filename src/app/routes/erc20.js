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

async function getContractFee(toAddress, amount) {
  let provider = 'http://' + service;
  let web3 = new Web3(new Web3.providers.HttpProvider(provider))
  web3.transactionConfirmationBlocks = 1;
  const addressTo = toAddress;
  const valueInEther = amount;

  const method = '0xa9059cbb'; // 'transfer(address,uint256)' in keccak-256 hash
  const UINT256_addressTo = utils.padLeadingZeros(addressTo.slice(2), 64)
  tokens = web3.utils.numberToHex(valueInEther * decimals); 
  tokens = utils.padLeadingZeros(tokens.slice(2), 64);
  const data = method + UINT256_addressTo + tokens;

  const bytes_count = data.slice(2).length / 2;
  let gasPrice = await web3.eth.getGasPrice();
  const gasUsed = (200 * bytes_count + 21000);
  const fee = gasUsed * gasPrice / 1e18;
  return fee;
}

async function createContract(addressFrom, addressTo, valueInEther, privKey) {
  let provider = 'http://' + service;
  let web3 = new Web3(new Web3.providers.HttpProvider(provider))
  web3.transactionConfirmationBlocks = 1;
  privKey = Buffer.from(privKey.slice(2), 'hex'); // Exclude 0x at the beginning of the private key
  const contract_address = contract; 
  const method = '0xa9059cbb'; // 'transfer(address,uint256)' in keccak-256 hash
  const UINT256_addressTo = utils.padLeadingZeros(addressTo.slice(2), 64)
  tokens = web3.utils.numberToHex(valueInEther * decimals); 
  tokens = utils.padLeadingZeros(tokens.slice(2), 64);
  const data = method + UINT256_addressTo + tokens;
  let txnCount = await web3.eth.getTransactionCount(addressFrom, "pending");
  let gasPrice = await web3.eth.getGasPrice();
  let txObject = {
      'nonce': web3.utils.numberToHex(txnCount),
      'to': contract_address,
      'gasPrice': web3.utils.numberToHex(gasPrice),
      'gasLimit': web3.utils.numberToHex(70000),
      'value': '0x0',
      // 'type': 2
      'data': data,
  };
  const common = new Common({ chain: chain });
  let tx = new ethTx(txObject, {common});
  tx = tx.sign(privKey)
  let serializedTx = tx.serialize();
  let rawTxHex = '0x' + serializedTx.toString('hex');
  return rawTxHex;
}

router.post('/api/get/balance/erc20', async (req, res) => {
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
      tokens: isNaN(tokens) ? 0 : tokens,
    });
  }
  return utils.badRequest(res);
});

router.post('/api/get/fee/erc20', async (req, res) => {
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
    let result = await getContractFee(to_address, amount);
    return res.send({ 
      status: 'done', 
      result: result
    });
  }
  return utils.badRequest(res);
});

router.post('/api/send/erc20', async (req, res) => {
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
    let from_address = await Eth.getByName(wallet.name);
    from_address = from_address[0].address;
    let result = await createContract(from_address, to_address, amount, wallet.privateKey);
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

router.post('/api/get/history/erc20', async (req, res) => {
  
});

module.exports = router;