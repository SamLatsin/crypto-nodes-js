const express = require('express');
const db = require('../middleware/db')

const router = express.Router();

router.get('/', async (req, res) => {
  const test = await db.getDb()
    .query("SELECT * FROM functions")
    .then((payload) => {
      return payload.rows;
    })
    .catch(() => {
      throw new Error("Query failed");
    });
  res.send({ message: 'Hello world', "test": test});
});

module.exports = router;
