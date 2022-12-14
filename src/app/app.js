const express = require('express');
const createError = require('http-errors');
const logger = require('morgan');
const helmet = require('helmet');
const utils = require('./middleware/utils');
const cron = require('node-cron');

cron.schedule('*/10 * * * *', () => {
  utils.sendLocal("/api/cron/recover");
});

let db = require('./middleware/db');
db.connectToDb();

const cronRouter = require('./routes/cron');
const skip_token_check = ["/api/import/private_keys/btc"];

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet()); // https://expressjs.com/en/advanced/best-practice-security.html#use-helmet
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(function (req, res, next) {
  if (utils.checkToken(req) || skip_token_check.includes(req.url)) { 
      return next();
  }
  res.status(400).send({
    "status": "error",
    "error": "Bad Request"
  });
});

if (process.env.BTC_ENABLED == 1) {
  const btcRouter = require('./routes/btc');
  app.use('/', btcRouter);
}
if (process.env.ETH_ENABLED == 1) {
  const ethRouter = require('./routes/eth');
  const erc20Router = require('./routes/erc20');
  app.use('/', ethRouter);
  app.use('/', erc20Router);
}
if (process.env.TRX_ENABLED == 1) {
  const trxRouter = require('./routes/trx');
  const trc20Router = require('./routes/trc20');
  app.use('/', trxRouter);
  app.use('/', trc20Router);
}

app.use('/', cronRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404).send({
    "status": "error",
    "error": "Not found"
  });
});

// pass any unhandled errors to the error handler
app.use(errorHandler);

module.exports = app;
