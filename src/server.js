const _express = require('express');
const _fs = require('fs');
const _path = require('path');
const _package = require('../package.json');
const _config = require('./config.json');
const _app = _express();
const _bridge = require('@bridge-protocol/bridge-protocol-js');
const _crypto = _bridge.Crypto;

var _passport = null;
var _passphrase = null;
var _passportHelper = null;
var _profileHelper = null;
var _claimHelper = null;
var _authHelper = null;
var _applicationHelper = null;
var _verificationPartnerHelper = null;
var _blockchainHelper = null;

async function Init()
{
    if(!await _initializeBridgeProtocol())
        return;

    if(!_initializeService())
        return;
}

function _initializeService(){
    //Check the service config
    if(!_config.serviceName){
        console.log("Service name not provided.  Please check configuration.");
        return false;
    }

    if(!_config.port){
        console.log("Port number not provided.  Please check configuration.");
        return false;
    }

    if(!_config.securityHeaderValue){
        console.log("Security header value not provided.  Please check configuration.");
        return false;
    }

    _app.use(_express.json());

    _app.route('/')
        .get(get_serverHome);

    _app.route('/images/logo')
        .get(get_logo);

    _app.route('/version')
        .get(get_version);

    _app.route('/claim/types')
        .get(get_claimTypes);

    _app.route('/profile/types')
        .get(get_profileTypes);

    _app.route('/passport/id')
        .get(get_passportId);

    _app.route('/passport/publickey')
        .get(get_passportPublicKey);

    _app.route('/passport/requestlogin')
        .post(post_passportRequestLogin);

    _app.route('/passport/verifylogin')
        .post(post_passportVerifyLogin);

    _app.route('/application/setstatus')
        .post(post_setStatus);

    _app.route('/application/addclaims')
        .post(post_addClaims);

    _app.route('/blockchain/transactioncomplete')
        .post(post_getBlockchainTransactionComplete);

    _app.route('/blockchain/transactiondetails')
        .post(post_getBlockchainTransactionDetails);

    _app.listen(_config.port);

    console.log(_config.serviceName + ' listening on port: ' + _config.port);
    return true;
}

async function _initializeBridgeProtocol(){
    //Validate the configuration and launch arguments
    if(!_config.passportFile){
        console.log("Passport filename not provided.  Please check configuration.");
        return false;
    }

    let passportFile = _path.join(__dirname,_config.passportFile);
    if (!_fs.existsSync(passportFile)) {
        console.log("Passport filename is invalid.  Please check configuration.");
        return false;
    }

    _getPassphrase();
    if(!_passphrase){
        console.log("Passphrase not provided.  Please check configuration or launch arguments.");
        return false;
    }

    //Load the passport context
    _passportHelper = new _bridge.Passport();
    _passport = await _passportHelper.loadPassportFromFile(passportFile,_passphrase);
    if(!_passport){
        console.log("Could not open passport from disk.  Aborting.");
        return false;
    }

    _passportHelper = new _bridge.Passport(_config.bridgeApiBaseUrl, _passport, _passphrase);
    _authHelper = new _bridge.Auth(_config.bridgeApiBaseUrl, _passport, _passphrase);
    _profileHelper = new _bridge.Profile(_config.bridgeApiBaseUrl, _passport, _passphrase);
    _claimHelper = new _bridge.Claim(_config.bridgeApiBaseUrl, _passport, _passphrase);
    _applicationHelper = new _bridge.Application(_config.bridgeApiBaseUrl, _passport, _passphrase);
    _verificationPartnerHelper = new _bridge.VerificationPartner(_config.bridgeApiBaseUrl, _passport, _passphrase);
    _blockchainHelper = new _bridge.Blockchain(_config.bridgeApiBaseUrl, _passport, _passphrase);

    //Make sure we can access the public API
    let details = await _passportHelper.getDetails(_passport.id);
    if(!details){
        let error = _getError("Could not get passport details from public API. Check public API endpoint configuration.");
        console.log(error);
        return false;
    }
        
    console.log("Passport " + _passport.id + " opened and Bridge Protocol initialized successfully.");
    return true;
}

function _getPassphrase(){
    //Check command line args
    process.argv.forEach(function (val, index, array) {
        if(val.indexOf("passphrase=") == 0)
        {
            _passphrase = val.replace("passphrase=","");
        }
    });

    //Check config
    if(_passphrase == null)
        _passphrase = _config.passportPassphrase;
}

function _verifyHeader(req)
{
    var securityHeader = req.headers.securityheader; //Apparently headers get lowercased?
    if(securityHeader && securityHeader == _config.securityHeaderValue)
        return true;

    return false;
}

function _getError(error){
    return "Bridge Protocol Integration Service: " + error;
}

async function get_serverHome(req, res){
    res.sendFile(__dirname + '/index.html');
}

async function get_logo(req,res){
    res.sendFile(__dirname + '/images/bridge_logo.png');
}

async function get_version(req,res){
    let version = _package.version;
    res.json({ version });
}

async function get_claimTypes(req, res){
    let error = null;
    let claimTypes = null;

    try
    { 
        claimTypes = await _claimHelper.getAllClaimTypes();
    }
    catch(err)
    {
        error = _getError(err.message);
    }

    res.json({ claimTypes,error });
}

async function get_profileTypes(req, res){
    let error = null;
    let profileTypes = null;

    try
    {
        profileTypes = await _profileHelper.getAllProfileTypes();
    }
    catch(err)
    {
        error = _getError(err.message);
    }

    res.json({ profileTypes,error });
}

async function get_passportId(req, res){
    let error = null;
    let passportId = null;

    try{
        if(!_verifyHeader(req)){
            throw new Error("Bad or missing authorization.");
        }

        passportId = _passport.id;
    }
    catch(err){
        error = _getError(err.message);
    }

    res.json({passportId, error});
}

async function get_passportPublicKey(req, res){
    let error = null;
    let publicKey = null;

    try{
        if(!_verifyHeader(req)){
            throw new Error("Bad or missing authorization.");
        }

        publicKey = _passport.publicKey;
    }
    catch(err){
        error = _getError(err.message);
    }

    res.json({publicKey, error});
}

async function post_passportRequestLogin(req, res){
    let error = null;
    let request = null;

    if(!_verifyHeader(req)){
        throw new Error("Bad or missing authorization.");
    }
    if(!req.body){
        throw new Error("Message body was null.");
    }
    if(!req.body.signingToken){
        throw new Error("Missing parameter: signingToken");
    }

    try
    {
        request = await _authHelper.createPassportLoginChallengeRequest(req.body.signingToken, req.body.claimTypes);
    }
    catch(err){
        error = _getError(err.message);
    }

    res.json({request, error});
}

async function post_passportVerifyLogin(req,res){
    let error = null;
    let verify = null;

    try{
        if(!_verifyHeader(req)){
            throw new Error("Bad or missing authorization.");
        }
        if(!req.body){
            throw new Error("Message body was null.");
        } 
        if(!req.body.response){
            throw new Error("Missing parameter: response");
        }

        verify = await _authHelper.verifyPassportLoginChallengeResponse(req.body.response, req.body.token, req.body.claimTypes, _passport.id);

        //Call the bridge network and find out the details of the passport that logged in
        verify.passportDetails = await _passportHelper.getDetails(verify.passportId);

        //Call the bridge network to find out about the current verification partners on the network
        //And make sure all of the claims that had a valid signature were also from known verification providers
        verify.unknownSignerClaimTypes = [];

        let verificationPartners = await _verificationPartnerHelper.getAllPartners();
        for(let i=0; i<verify.claims.length; i++){
            let partner = getPartnerById(verificationPartners, verify.claims[i].signedById);
            if(!partner)
            {
                verify.unknownSignerClaimTypes.push(verify.claims[i].claimTypeId);
            }
        }
    }
    catch(err){
        error = _getError(err.message);
    }
    
    res.json({ verify, error });
}

function getPartnerById(verificationPartners, id){
    for(let i=0; i<verificationPartners.length; i++){
        if(verificationPartners[i].id == id){
            return verificationPartners[i];
        }
    }

    return null;
}

async function post_setStatus(req, res, next){
    let status = false;
    let error = null;

    try{
        if(!_verifyHeader(req)){
            throw new Error("Bad or missing authorization.");
        }
        if(!req.body){
            throw new Error("Message body was null.");
        } 
        if(!req.body.applicationId){
            throw new Error("Missing parameter: applicationId");
        }
        if(!req.body.status){ 
            throw new Error("Missing parameter: applicationStatus");
        } 

        await _applicationHelper.setStatus(req.body.applicationId, req.body.status);
        status = true;
    }
    catch(err){
        error = _getError(err.message);
    }

    return res.json({status, error});
}

async function post_addClaims(req, res, next){
    let status = false;
    let error = null;
    try{
        if(!_verifyHeader(req)){
            throw new Error("Bad or missing authorization.");
        }
        if(!req.body){
            throw new Error("Message body was null.");
        } 
        if(!req.body.claims){
            throw new Error("Missing parameter: claims");
        }
        if(!req.body.applicationId){ 
            throw new Error("Missing parameter: applicationId");
        } 
        if(!req.body.publicKey){ 
            throw new Error("Missing parameter: publicKey");
        } 

        let claimPackages = await _claimHelper.createClaimPackages(req.body.publicKey, req.body.claims);
        await _applicationHelper.addClaims(req.body.applicationId, claimPackages);

        status = true;
    }
    catch(err){
        error = _getError(err.message);
    }

    return res.json({status, error});
}

async function post_getBlockchainTransactionComplete(req, res, next){
    let complete = false;
    let error = null;
    try{
        if(!_verifyHeader(req)){
            throw new Error("Bad or missing authorization.");
        }
        if(!req.body){
            throw new Error("Message body was null.");
        } 
        if(!req.body.network){
            throw new Error("Missing parameter: network");
        }
        if(!req.body.transactionId){
            throw new Error("Missing parameter: transactionId");
        }
        let res = await _blockchainHelper.checkTransactionComplete(req.body.network, req.body.transactionId);
        if(res){
            complete = true;
        }
    }
    catch(err){
        error = _getError(err.message);
    }
    return res.json({complete, error});
}

async function post_getBlockchainTransactionDetails(req, res, next){
    let info = null;
    let error = null;
    try{
        if(!_verifyHeader(req)){
            throw new Error("Bad or missing authorization.");
        }
        if(!req.body){
            throw new Error("Message body was null.");
        } 
        if(!req.body.network){
            throw new Error("Missing parameter: network");
        }
        if(!req.body.transactionId){
            throw new Error("Missing parameter: transactionId");
        }

        info = await _blockchainHelper.getTransactionStatus(req.body.network, req.body.transactionId);
    }
    catch(err){
        error = _getError(err.message);
    }
    return res.json({info, error});
}

Init();