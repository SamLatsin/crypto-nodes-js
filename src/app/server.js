const { Client } = require("pg");
const express = require("express");
const app = express();
const port = 5656;

const client = new Client({
  password: process.env.PG_PASSWORD,
  user: process.env.PG_USER,
  database:process.env.PG_DBNAME,
  host: "postgres",
});

app.get("/", async (req, res) => {
  // const test = await client
  //   .query("SELECT * FROM functions")
  //   .then((payload) => {
  //     return payload.rows;
  //   })
  //   .catch(() => {
  //     throw new Error("Query failed");
  //   });
  const results = {
      "result":"Welcome to REST API",
      // "test":test
    };
  res.setHeader("Content-Type", "application/json");
  res.status(200);
  res.send(JSON.stringify(results));
});

(async () => {
  await client.connect();

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
})();