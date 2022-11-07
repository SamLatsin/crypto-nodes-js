const axios = require('axios');
const crypto = require('crypto');

module.exports = {
	checkToken: function(req) {
		if (req.url.search(/cron/) == -1) {
			var ticker = req.url.split("/").slice(-1)[0];
			if (ticker == "btc") {
				if (req.body.token == process.env.BTC_TOKEN) {
					return true;
				}
			}
			return false;
		}
		return true;
	},
	sendRpc: async function(method, args, link) {
		let options = {
		    url: "http://" + process.env.BTC_RPC_USER + ":" + process.env.BTC_RPC_PASSWORD + "@" + link,
		    headers:
		    { 
		     "content-type": "application/x-www-form-urlencoded"
		    },
		    body: JSON.stringify( {"jsonrpc": "1.0", "id": "curltest", "method": method, "params": args })
		};
		try {
			const res = await axios.post(options.url, options.body, options.headers);
			return res.data; 
		}
		catch (error) {
			return error.response.data;
		}
	},
	getNumbers: function(str) {
		return str.match(/\d+/);
	},
	generateUUID: function() {
		return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
			(c ^ crypto.webcrypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
		);
	},
	badRequest: function(res) {
		return res.status(400).send({
			status: "error",
		 	error: "Bad Request"
		});
	},
	badToken: function(res) {
		return res.status(401).send({
	        status: "error",
	    	error: "Bad token",
	    });
	}
};