const express = require('express');
const RecoverQueue = require('../classes/recover_queue.class');
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

