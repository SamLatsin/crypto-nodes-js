const db = require('../middleware/db').getDb();
const model = "recover_queue";

let Btc = {
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
			name: "insert recover " + fields.name,
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
			name: "update recover " + id,
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
	delete: async function(name) {
		let query = "DELETE * FROM " + model + " WHERE name=$1";
		query = {
			name: "delete recover " + name,
			text: query,
			values: [name]
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
	getByName: async function(name) {
		let query = "SELECT * FROM " + model + " WHERE name=$1 ORDER BY id DESC";
		const res = await db
	    .query(query, [name])
	    .then((payload) => {
	      return payload.rows;
	    })
	    .catch(() => {
	    	return false;
	    });
		return res;
	}
}
module.exports = Btc;