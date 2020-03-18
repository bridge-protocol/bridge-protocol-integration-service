var express = require('express');
var router = express.Router();

//Sub-routes
router.get("/id", get_passportId);
router.get("/publicKey", get_publicKey);
router.post("/idfromkey", post_passportIdFromKey);
router.post("/verify", post_verifySignature);
router.post("/verifyhash", post_verifyHash);
router.post("/sign", post_signMessage);
router.post("/encrypt", post_encryptMessage);
router.post("/decrypt", post_decryptMessage);
router.post("/requestlogin", post_passportRequestLogin);
router.post("/verifylogin", post_passportVerifyLogin);
router.post("/requestpayment", post_passportRequestPayment);
router.post("/verifypayment", post_passportVerifyPayment);
router.post("/requestclaimsimport", post_passportRequestClaimsImport);

async function get_passportId(req, res) {
    res.json({ passportId: req.passport.id });
}

async function get_publicKey(req, res) {
    res.json({ publicKey: req.passport.publicKey });
}

async function post_passportIdFromKey(req, res, next) {
    let passportId = null;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.publicKeyHex) {
            throw new Error("Missing parameter: publicKeyHex");
        }

        passportId = await req.bridge.Utils.Crypto.getPassportIdForPublicKey(req.body.publicKeyHex);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ passportId, error });
}

async function post_signMessage(req, res, next) {
    let signedMessage = null;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.messageText) {
            throw new Error("Missing parameter: messageText");
        }

        signedMessage = await req.bridge.Utils.Crypto.signMessage(req.body.messageText, req.passport.privateKey, req.passphrase, true);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ signedMessage, error });
}

async function post_verifySignature(req, res, next) {
    let verified = false;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.messageSignature) {
            throw new Error("Signed message not provided.");
        }
        if (!req.body.publicKeyHex) {
            throw new Error("Public key not provided.");
        }

        verified = await req.bridge.Utils.Crypto.verifySignedMessage(req.body.messageSignature, req.body.publicKeyHex);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ verified, error });
}

async function post_verifyHash(req, res, next){
    let verified = false;
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

        verified = req.bridge.Utils.Crypto.verifyHash(req.body.str, req.body.hash);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ verified, error });
}

async function post_encryptMessage(req, res, next) {
    let encryptedMessage = null;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.messageText) {
            throw new Error("Missing parameter: messageText");
        }
        if (!req.body.decryptPublicKeyHex) {
            req.body.decryptPublicKeyHex = req.passport.key.public; //If it's not specified, we assume we are encrypting it and use our key
        }

        encryptedMessage = await req.bridge.Utils.Crypto.encryptMessage(req.body.messageText, req.body.decryptPublicKeyHex, req.passport.privateKey, req.passphrase, true);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ encryptedMessage, error });
}

async function post_decryptMessage(req, res, next) {
    let decryptedMessage = null;
    let error = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.encryptedMessage) {
            throw new Error("Missing parameter: encryptedMessage");
        }
        if (!req.body.encryptingPublicKeyHex) {
            req.body.encryptingPublicKeyHex = req.passport.key.public; //If it's not specified, we assume we encrypted it and use our key
        }

        decryptedMessage = await req.bridge.Utils.Crypto.decryptMessage(req.body.encryptedMessage, req.body.encryptingPublicKeyHex, req.passport.privateKey, req.passphrase);
    }
    catch (err) {
        error = err.message;
    }

    return res.json({ decryptedMessage, error });
}

async function post_passportRequestLogin(req, res){
    let error = null;
    let request = null;

    if(!req.body){
        throw new Error("Message body was null.");
    }
    if(!req.body.signingToken){
        throw new Error("Missing parameter: signingToken");
    }

    try
    {
        request = await req.bridge.Messaging.Auth.createPassportChallengeRequest(req.passport, req.passphrase, req.body.signingToken, req.body.claimTypes, res.body.networks);
    }
    catch(err){
        error = err.message;
    }

    res.json({request, error});
}

async function post_passportVerifyLogin(req,res){
    let error = null;
    let verify = null;

    try{
        if(!req.body){
            throw new Error("Message body was null.");
        } 
        if(!req.body.response){
            throw new Error("Missing parameter: response");
        }

        let res = await await req.bridge.Messaging.Auth.verifyPassportChallengeResponse(req.passport, req.passphrase, req.body.response, req.body.token, req.body.claimTypes, req.body.networks);

        //Call the bridge network and find out the details of the passport that logged in
        verify.passportDetails = await req.bridge.Services.Passport.getDetails(res.passport, res.passphrase, res.loginResponse.passportId);

        //Make sure all of the claims that had a valid signature were also from known verification providers
        verify.unknownSignerClaimTypes = [];
        for(let i=0; i<verify.claims.length; i++){
            let partner = req.bridge.Services.Partner.getPartner(verify.claims[i].signedById);
            if(!partner)
                verify.unknownSignerClaimTypes.push(verify.claims[i].claimTypeId);
        }
    }
    catch(err){
        error = err.message;
    }
    
    res.json({ verify, error });
}

async function post_passportRequestPayment(req, res) {
    let error = null;
    let request = null;

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

    try {
        request = await req.bridge.Messsaging.Payment.createPaymentRequest(req.passport, req.pasphrase, req.body.network, req.body.amount, req.body.address, req.body.identifier);
    }
    catch (err) {
        error = err.message;
    }

    res.json({ request, error });
}

async function post_passportVerifyPayment(req, res) {
    let error = null;
    let verify = null;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.response) {
            throw new Error("Missing parameter: response");
        }

        let res = await res.bridge.Messsaging.Payment.verifyPaymentResponse(req.passport, req.passphrase, req.body.response);
        verify = res.paymentResponse;
        //Call the bridge network and find out the details of the passport that logged in
        verify.passportDetails = await passportHelper.getDetails(res.passportId);
    }
    catch (err) {
        error = err.message;
    }

    res.json({ verify, error });
}

async function post_passportRequestClaimsImport(req, res) {
    let error = null;
    let request = null;

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
        let claimPackages = await req.bridge.Utils.Claim.createClaimPackagesFromClaims(req.body.claims, req.body.publicKey, req.passport.publicKey, req.passport.privateKey, req.password);
	    //Create the request
        request = await req.bridge.Messaging.Claim.createClaimsImportRequest(req.passsport, req.passphrase, claimPackages);
    }
    catch (err) {
        error = err.message;
    }

    res.json({ request, error });
}


module.exports = router;
