const db = require('../middleware/db').getDb();
const model = "btc";

var Btc = {
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
	getByName: async function(name) {
		query = "SELECT * FROM " + model + " WHERE name=$1 ORDER BY id DESC";
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
	getByNameAndAddress: async function(name, address) {
		query = "SELECT * FROM " + model + " WHERE name=$1 AND address=$2 ORDER BY id DESC";
		const res = await db
	    .query(query, [name, address])
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