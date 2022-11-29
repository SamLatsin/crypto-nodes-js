const express = require('express');
const utils = require('../middleware/utils');
const Wallet = require('../classes/wallet.class');
const Btc = require('../classes/eth.class');
const router = express.Router();

let network = "";
let service = "";
if (process.env.ETH_TESTNET == 1) {
  network = "ropsten";
  service = "geth-ropsten"
}
else {
  network = "mainnet";
  service = "geth";
}

router.post('/api/test/eth', async (req, res) => {
  const name = req.body.name;
  let test = utils.sendRpcEth("eth_syncing", [], service + ":8545");
  return res.send({ 
    status: 'done',
    result: test
  });
});

module.exports = router;