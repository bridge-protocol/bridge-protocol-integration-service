var express = require('express');
var router = express.Router();

//Sub-routes
router.get("/id", get_passportId);
router.get("/publicKey", get_publicKey);
router.post("/idfromkey", post_passportIdFromKey);
router.post("/sign", post_signMessage);
router.post("/verify", post_verifySignature);
router.post("/verifyhash", post_verifyHash);
router.post("/encrypt", post_encryptMessage);
router.post("/decrypt", post_decryptMessage);
router.post("/requestclaimsimport", post_passportRequestClaimsImport);
router.post("/requestauth", post_passportRequestAuth);
router.post("/verifyauth", post_passportVerifyAuth);
router.post("/requestpayment", post_passportRequestPayment);
router.post("/verifypayment", post_passportVerifyPayment);

async function get_passportId(req, res) {
    res.json({ response: req.passport.id });
}

async function get_publicKey(req, res) {
    res.json({ response: req.passport.publicKey });
}

async function post_passportIdFromKey(req, res, next) {
    let response = null;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.publicKey) {
            throw new Error("Missing parameter: publicKey");
        }

        response = await req.bridge.Utils.Crypto.getPassportIdForPublicKey(req.body.publicKey);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ response, error });
}

async function post_signMessage(req, res, next) {
    let response = null;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.messageText) {
            throw new Error("Missing parameter: messageText");
        }

        response = await req.bridge.Utils.Crypto.signMessage(req.body.messageText, req.passport.privateKey, req.passphrase, true);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ response, error });
}

async function post_verifySignature(req, res, next) {
    let response = false;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.messageSignature) {
            throw new Error("Signed message not provided.");
        }
        if (!req.body.publicKey) {
            throw new Error("Public key not provided.");
        }

        response = await req.bridge.Utils.Crypto.verifySignedMessage(req.body.messageSignature, req.body.publicKey);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ response, error });
}

async function post_verifyHash(req, res, next){
    let response = false;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.str) {
            throw new Error("String not provided.");
        }
        if (!req.body.hash) {
            throw new Error("Hash not provided.");
        }

        response = req.bridge.Utils.Crypto.verifyHash(req.body.str, req.body.hash);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ response, error });
}

async function post_encryptMessage(req, res, next) {
    let response = null;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.messageText) {
            throw new Error("Missing parameter: messageText");
        }
        if (!req.body.decryptPublicKey) {
            req.body.decryptPublicKey = req.passport.key.public; //If it's not specified, we assume we are encrypting it and use our key
        }

        response = await req.bridge.Utils.Crypto.encryptMessage(req.body.messageText, req.body.decryptPublicKey, req.passport.privateKey, req.passphrase, true);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ response, error });
}

async function post_decryptMessage(req, res, next) {
    let response = null;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.encryptedMessage) {
            throw new Error("Missing parameter: encryptedMessage");
        }
        if (!req.body.encryptingPublicKey) {
            req.body.encryptingPublicKey = req.passport.key.public; //If it's not specified, we assume we encrypted it and use our key
        }

        response = await req.bridge.Utils.Crypto.decryptMessage(req.body.encryptedMessage, req.body.encryptingPublicKey, req.passport.privateKey, req.passphrase);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ response, error });
}

async function post_passportRequestAuth(req, res){
    let error = null;
    let response = null;

    if(!req.body){
        throw new Error("Message body was null.");
    }
    if(!req.body.token){
        throw new Error("Missing parameter: token");
    }

    try
    {
        response = await req.bridge.Messaging.Auth.createPassportChallengeRequest(req.passport, req.passphrase, req.body.token, req.body.claimTypes, req.body.networks);
    }
    catch(err){
        error = err.message;
    }

    res.json({response, error});
}

async function post_passportVerifyAuth(req,res){
    let error = null;
    let response = null;

    try{
        if(!req.body){
            throw new Error("Message body was null.");
        } 
        if(!req.body.response){
            throw new Error("Missing parameter: response");
        }
        if(!req.body.token){
            throw new Error("Missing parameter: token");
        }

        response = await req.bridge.Messaging.Auth.verifyPassportChallengeResponse(req.passport, req.passphrase, req.body.response, req.body.token);
        
        //Make sure all of the claims that had a valid signature were also from known verification providers
        if(response.claims){
            for(let i=0; i<response.claims.length; i++){
                let partner = await req.bridge.Services.Partner.getPartner(response.claims[i].signedById);
                response.claims[i].signedByPartner = (partner != null);
            }
        }
    }
    catch(err){
        response = null;
        error = err.message;
    }
    
    res.json({ response, error });
}

async function post_passportRequestPayment(req, res) {
    let error = null;
    let response = null;

    if (!req.body) {
        throw new Error("Message body was null.");
    }
    if (!req.body.network) {
        throw new Error("Missing parameter: network");
    }
    if (!req.body.amount) {
        throw new Error("Missing parameter: amount");
    }
    if (!req.body.address) {
        throw new Error("Missing parameter: address");
    }
    if(!req.body.identifier){
        throw new Error("Missing parameter: identifier");
    }

    try {
        response = await req.bridge.Messaging.Payment.createPaymentRequest(req.passport, req.passphrase, req.body.network, req.body.amount, req.body.address, req.body.identifier);
    }
    catch (err) {
        error = err.message;
    }

    res.json({ response, error });
}

async function post_passportVerifyPayment(req, res) {
    let error = null;
    let response = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.response) {
            throw new Error("Missing parameter: response");
        }

        response = await req.bridge.Messaging.Payment.verifyPaymentResponse(req.passport, req.passphrase, req.body.response);
    }
    catch (err) {
        response = null;
        error = err.message;
    }

    res.json({ response, error });
}


async function post_passportRequestClaimsImport(req, res) {
    let error = null;
    let response = null;

    if (!req.body) {
        throw new Error("Message body was null.");
    }
    if (!req.body.claims) {
        throw new Error("Missing parameter: claims");
    }
    if(!req.body.publicKey){
        throw new Error("Missing parameter: publicKey");
    }

    try {
        let claimPackages = await req.bridge.Utils.Claim.createClaimPackagesFromClaims(req.body.claims, req.body.publicKey, req.passport.publicKey, req.passport.privateKey, req.passphrase);
        response = await req.bridge.Messaging.Claim.createClaimsImportRequest(req.passport, req.passphrase, claimPackages);
    }
    catch (err) {
        error = err.message;
    }

    res.json({ response, error });
}

module.exports = router;
