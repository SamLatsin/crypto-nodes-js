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
};