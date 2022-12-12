const db = require('../middleware/db').getDb();
const model = "trx_contracts_erc20";

let Trx_contract_erc20 = {
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
			name: "insert trx contract erc20 " + fields.name + fields.address,
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
			name: "update trx contract erc20 " + id,
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
	delete: async function(id) {
		let query = "DELETE FROM " + model + " WHERE id=$1";
		query = {
			name: "delete trx contract erc20 " + id,
			text: query,
			values: [id]
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
	deleteByTicker: async function(ticker) {
		let query = "DELETE FROM " + model + " WHERE ticker=$1";
		query = {
			name: "delete trx contract erc20 by ticker " + ticker,
			text: query,
			values: [ticker]
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
	getByTicker: async function(ticker) {
		let query = "SELECT * FROM " + model + " WHERE ticker=$1 ORDER BY id DESC";
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
	getByAddress: async function(address) {
		let query = "SELECT * FROM " + model + " WHERE address=$1 ORDER BY id DESC";
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
	getAll: async function() {
		let query = "SELECT * FROM " + model + " ORDER BY id ASC";
		const res = await db
	    .query(query)
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	}
}
module.exports = Trx_contract_erc20;