const express = require('express');
const createError = require('http-errors');
const logger = require('morgan');
const helmet = require('helmet');
const utils = require('./middleware/utils');

var db = require('./middleware/db');
db.connectToDb();

const btcRouter = require('./routes/btc');

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet()); // https://expressjs.com/en/advanced/best-practice-security.html#use-helmet
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(function (req, res, next) {
    if (utils.checkToken(req)) { 
        return next();
    }
    res.status(400).send({
      "status": "error",
      "error": "Bad Request"
    });
});

app.use('/', btcRouter);

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
