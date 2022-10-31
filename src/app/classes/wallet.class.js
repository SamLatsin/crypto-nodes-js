const db = require('../middleware/db').getDb();
const model = "wallets";

var Wallet = {
	getWallets: async function() {
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
	}
}
module.exports = Wallet;