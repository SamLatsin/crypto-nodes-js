const db = require('../middleware/db').getDb();
const model = "wallets";

var Wallet = {
	getAll: async function() {
		query = "SELECT * FROM " + model;
		const res = await db
	    .query(query)
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
	    return res;
	},
	getLastByTicker: async function(ticker) {
		query = "SELECT * FROM " + model + " WHERE ticker='" + ticker + "' ORDER BY name DESC LIMIT 1";
		console.log(query);
		const res = await db
	    .query(query)
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	},
	insert: async function(fields) {
		return "to do";
	}
}
module.exports = Wallet;