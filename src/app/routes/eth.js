const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Btc = require('../classes/eth.class');
const router = express.Router();

let network = "";
let service = "";
if (process.env.ETH_TESTNET == 1) {
  network = "ropsten";
  service = "geth-ropsten:8545"
}
else {
  network = "mainnet";
  service = "geth:8545";
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

router.post('/api/test/eth', async (req, res) => {
  const name = req.body.name;
  return res.send({ 
    status: 'done',
    name: name
  });
});

module.exports = router;