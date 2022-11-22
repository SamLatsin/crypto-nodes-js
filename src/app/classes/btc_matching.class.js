const db = require('../middleware/db').getDb();
const model = "btc_matchings";

let BtcMatching = {
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
			name: "insert matching " + fields.match.slice(0, 32),
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
			name: "update matching " + id,
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
			name: "delete matching " + id,
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
	deleteByNAddress: async function(address) {
		let query = "DELETE FROM " + model + " WHERE address=$1";
		query = {
			name: "delete matching by address " + name,
			text: query,
			values: [address]
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
	getByMatch: async function(match) {
		let query = "SELECT * FROM " + model + " WHERE match=$1 ORDER BY id DESC";
		const res = await db
	    .query(query, [match])
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
	}
}
module.exports = BtcMatching;