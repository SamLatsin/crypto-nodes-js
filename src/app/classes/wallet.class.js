const db = require('../middleware/db').getDb();
const model = "wallets";

let Wallet = {
	getAll: async function() {
		let query = "SELECT * FROM " + model;
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
		let query = "SELECT * FROM " + model + " WHERE ticker=$1 ORDER BY id DESC LIMIT 1";
		const res = await db
	    .query(query, [ticker])
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	},
	insert: async function(fields) {
		let query = "INSERT INTO " + model;
		let keys = [];
		let values = [];
		let data = [];
		let i = 1;
		for (const [key, value] of Object.entries(fields)) {
			keys.push('"' + key + '"');
			values.push('$' + i);
			data.push(value);
			i++;
		}
		keys = keys.join(", ");
		values = values.join(", ");
		query = query + " (" + keys + ") VALUES (" + values + ") RETURNING id";
		const res = await db
	    .query(query, data)
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	},
	getByTickerAndName: async function(ticker, name) {
		let query = "SELECT * FROM " + model + " WHERE ticker=$1 AND name=$2";
		const res = await db
	    .query(query, [ticker, name])
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	}
}
module.exports = Wallet;