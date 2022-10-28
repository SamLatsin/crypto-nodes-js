const { Client } = require("pg");

const db = new Client({
  password: process.env.PG_PASSWORD,
  user: process.env.PG_USER,
  database:process.env.PG_DBNAME,
  host: "postgres",
});

module.exports = {
	connectToDb: function() {
		db.connect();
	    return true;
	},

	getDb: function() {
		return db;
	} 
}

// db.connect();
// module.exports = db;
