const db = require('../middleware/db').getDb();
const model = "btc_transactions";

let BtcTransaction = {
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
		query = {
			name: "insert transaction " + fields.txid.slice(0, 32) + " " + fields.amount,
			text: query,
			values: data
		};
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
	update: async function(fields, id) {
		let query = "UPDATE " + model + " SET ";
		let data = [];
		let i = 1;
		let values = []
		for (const [key, value] of Object.entries(fields)) {
			values.push('"' + key + '"' + "=$" + i);
			data.push(value);
			i++;
		}
		values = values.join(", ");
		query = query + values + " WHERE id=" + id;
		query = {
			name: "update transaction " + id,
			text: query,
			values: data
		};
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
	getToSync: async function(name) {
		let query = 'SELECT * FROM ' + model + ' WHERE ("fromWallet"=$1 OR "toWallet"=$1) and ("fromChecks"<2 OR "toChecks"<2)';
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
		let query = 'SELECT * FROM ' + model + ' WHERE txid=$1';
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
	getByNameAndTxid: async function(name, txid) {
		let query = 'SELECT * FROM ' + model + ' WHERE ("fromWallet"=$1 OR "toWallet" = $1) AND txid=$2 ';
		const res = await db
	    .query(query, [name, txid])
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	},
	getByName: async function(name) {
		let query = 'SELECT * FROM ' + model + ' WHERE "fromWallet"=$1 OR "toWallet"=$1';
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
	getByNameChunk: async function(name, count, skip) {
		let query = 'SELECT * FROM ' + model + ' WHERE "fromWallet"=$1 OR "toWallet"=$1 LIMIT $2 OFFSET $3';
		const res = await db
	    .query(query, [name, count, skip])
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	},
	getByNameReceivedChunk: async function(name, count, skip) {
		let query = 'SELECT * FROM ' + model + ' WHERE "toWallet"=$1 LIMIT $2 OFFSET $3';
		const res = await db
	    .query(query, [name, count, skip])
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	},
	getByAddress: async function(address) {
		let query = 'SELECT * FROM ' + model + ' WHERE "fromAddress"=$1 OR "toAddress"=$1';
		const res = await db
	    .query(query, [address])
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