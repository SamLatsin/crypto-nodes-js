const db = require('../middleware/db').getDb();
const model = "btc_transactions";

var BtcTransaction = {
	insert: async function(fields) {
		query = "INSERT INTO " + model;
		keys = [];
		values = [];
		data = [];
		i = 1;
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
	update: async function(fields, id) {
		query = "UPDATE " + model + " SET ";
		data = [];
		i = 1;
		values = []
		for (const [key, value] of Object.entries(fields)) {
			values.push('"' + key + '"' + "=$" + i);
			data.push(value);
			i++;
		}
		values = values.join(", ");
		query = query + values + " WHERE id=" + id;
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
	getToSync: async function(name) {
		query = 'SELECT * FROM ' + model + ' WHERE ("fromWallet"=$1 OR "toWallet"=$1) and ("fromChecks"<2 OR "toChecks"<2)';
		const res = await db
	    .query(query, [name])
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	},
	getByTxid: async function(txid) {
		query = 'SELECT * FROM ' + model + ' WHERE txid=$1';
		const res = await db
	    .query(query, [txid])
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	},
	getByName: async function(name) {
		query = 'SELECT * FROM ' + model + ' WHERE "fromWallet"=$1 OR "toWallet"=$1';
		const res = await db
	    .query(query, [name])
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	},
}
module.exports = BtcTransaction;