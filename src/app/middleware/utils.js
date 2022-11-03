const axios = require('axios');

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
			return error.toJSON();
			// return null;
		}
	},
	getNumbers: function(str) {
		return str.match(/\d+/);
	}
};