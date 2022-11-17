const express = require('express');
const Wallet = require('../classes/wallet.class');
const Btc = require('../classes/btc.class');
const RecoverQueue = require('../classes/recover_queue.class');
const BtcTransaction = require('../classes/btc_transaction.class');
const utils = require('../middleware/utils');
const router = express.Router();

async function isRecoveringBTC(name) {
  let debug1 = await utils.sendRpc("loadwallet", [name], "bitcoin:8332/");
  let result = await utils.sendRpc("getwalletinfo", [], "bitcoin:8332/wallet/" + name);
  if (result.result == null) { 
    return true; // maybe need to change this
  }
  if (result.result.scanning != false) {
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

async function recoverTransactionsBTC(name) { // not working well
  const load = await utils.sendRpc("loadwallet", [name], "bitcoin:8332/");
  const count = 50;
  let transactions = [];
  let txids = [];
  let i = 0;
  do {
  	transactions = await utils.sendRpc("listtransactions", ["*", count, i*count], "bitcoin:8332/wallet/" + name);
  	transactions = transactions.result;
  	for (const [key, transaction] of Object.entries(transactions)) {
	  txids.push(transaction.txid);
	}
  	i++;
  } while (transactions.length != 0)
  for (const [key, txid] of Object.entries(txids)) {
  	let body = {
  	  name: name,
  	  txid: txid,
  	  token: process.env.BTC_TOKEN
  	};
    res = await utils.sendLocal("/api/walletnotify/btc", body);
    console.log(res);
  } 
  return txids;
}

async function recoverAddressesBTC(name) {
  let wallet = await Wallet.getByTickerAndName('btc', name);
  wallet = wallet[0];
  const load = await utils.sendRpc("loadwallet", [wallet.name], "bitcoin:8332/");
  const addresses_raw = await utils.sendRpc("listaddressgroupings", [], "bitcoin:8332/wallet/" + wallet.name);
  for (const [key, address_list] of Object.entries(addresses_raw)) {
    if (address_list != null) {
      if (address_list[0] != null) {
        for (const [key1, address] of Object.entries(address_list[0])) {
          if (address.length >= 2) {
            let field = {
              name: wallet.name,
              address: address[0],
              balance: address[1]
            };
            let from_db = await Btc.getByNameAndAddress(wallet.name, address[0]);
            if (from_db.length == 0) {
              await Btc.insert(field);
            }
          }
        }
      }
    }
  }
  return;
}

async function recoverWalletBTC(name) {
  let wallet = await Wallet.getByTickerAndName("btc", name);
  wallet = wallet[0];
  const fields = {
    recovered: 1
  };
  await Wallet.update(fields, wallet.id);
  await recoverAddressesBTC(name);
  return;
}

async function startRecover(ticker, name, start_height) {
  if (ticker == "btc") {
    let load = await utils.sendRpc("loadwallet", [name], "bitcoin:8332/");
	if (parseInt(start_height) == 0) {
	  let rescan = await utils.sendRpc("rescanblockchain", [], "bitcoin:8332/wallet/" + name);
	}
	else {
	  let rescan = await utils.sendRpc("rescanblockchain", [start_height], "bitcoin:8332/wallet/" + name);
	}
  }
  return true;
}

router.post('/api/cron/recover', async (req, res) => {
  let queue = await RecoverQueue.getAll();
  if (queue && queue.length > 0) {
  	let item = queue[0];
  	if (item.ticker == "btc") {
  	  if (await isRecoveringBTC(item.name) && item.recovering == 1) {
      	return res.send({ 
    		  status: 'done', 
    		  result: item.name + " is already recovering"
    		});
  	  }
  	  else {
  	  	if (item.recovering == 0) {
  	  	  let fields = {
  	  	  	recovering: 1
  	  	  };
  	  	  await RecoverQueue.update(fields, item.id);
  	  	  startRecover(item.ticker, item.name, item.start_height);
  	  	  return res.send({ 
      			status: 'done', 
      			result: "starting recover " + item.name
      		});
  	  	}
  	  	else {
  	  	  await recoverWalletBTC(item.name);
          await RecoverQueue.delete(item.id);
          await utils.sendLocal("/api/cron/recover");
          return res.send({ 
      			status: 'done', 
      			result: "starting new recover"
      		});
  	  	}
  	  }
  	}
  }
  return res.send({ 
	  status: 'done', 
	  result: "queue is empty"
  });
});

module.exports = router;

