const _bridge = require('@bridge-protocol/bridge-protocol-js');
//const _bridge = require('../../bridge-protocol-js/src/index');
const _fs = require('fs');
const _path = require('path');

//Bridge params
const _config = require('./config.json');
var _passport = null;
var _passphrase = null;

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var passportRouter = require('./routes/passport');
var blockchainRouter = require('./routes/blockchain');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Authorization check filter
app.use(function (req, res, next) {
  //Forward to error handler with unauthorized if we aren't just hitting the index view
  if (!verifyHeader(req) && req.url != "/") {
    next(createError(401));
  }
  else {
    //Set our global variables for the request and relay to next
    req.version = _config.version;
    req.bridge = _bridge;
    req.passport = _passport;
    req.passphrase = _passphrase;
    next();
  }
});

//Define our main routes;
app.use('/', indexRouter);
app.use('/passport', passportRouter);
app.use('/blockchain', blockchainRouter);

// Catch 404 and forward to error handler if the request is to a route we aren't handling
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function verifyHeader(req) {
  if (req.headers.securityheader && req.headers.securityheader == _config.securityHeaderValue)
    return true;

  return false;
}

async function initBridge(req) {
  //Load config
  //Validate the configuration and launch arguments
  if (!_config.passportFile) {
    console.log("Passport filename not provided.  Please check configuration.");
    return false;
  }

  let passportFile = _path.join(__dirname, _config.passportFile);
  if (!_fs.existsSync(passportFile)) {
    console.log("Passport filename is invalid.  Please check configuration.");
    return false;
  }

  //Get the passphrase from either the command line or config
  //Check command line args
  process.argv.forEach(function (val, index, array) {
    if (val.indexOf("passphrase=") == 0) {
      _passphrase = val.replace("passphrase=", "");
    }
  });

  //Check config
  if (_passphrase == null)
    _passphrase = _config.passportPassphrase;

  if (!_passphrase) {
    console.log("Passphrase not provided.  Please check configuration or launch arguments.");
    return;
  }

  //Load the passport context
  _passport = new _bridge.Models.Passport();
  await _passport.openFile(__dirname + "/" + _config.passportFile, _passphrase);
  if (!_passport.id) {
    console.log("Could not open passport from disk.  Aborting.");
    return;
  }
  console.log("Passport " + _passport.id + " opened successfully.");
}
initBridge();


module.exports = app;
