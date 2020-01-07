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

        passportId = await req.bridge.Crypto.getPassportIdForPublicKey(req.body.publicKeyHex);
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

        signedMessage = await req.bridge.Crypto.signMessage(req.body.messageText, req.passport.privateKey, req.passphrase, true);
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

        verified = await req.bridge.Crypto.verifySignedMessage(req.body.messageSignature, req.body.publicKeyHex);
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

        verified = req.bridge.Crypto.verifyHash(req.body.str, req.body.hash);
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

        encryptedMessage = await req.bridge.Crypto.encryptMessage(req.body.messageText, req.body.decryptPublicKeyHex, req.passport.privateKey, req.passphrase, true);
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

        decryptedMessage = await req.bridge.Crypto.decryptMessage(req.body.encryptedMessage, req.body.encryptingPublicKeyHex, req.passport.privateKey, req.passphrase);
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
        let authHelper = new req.bridge.Auth(req.apiUrl, req.passport, req.passphrase);
        request = await authHelper.createPassportLoginChallengeRequest(req.body.signingToken, req.body.claimTypes);
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

        let authHelper = new req.bridge.Auth(req.apiUrl, req.passport, req.passphrase);
        let passportHelper = new req.bridge.Passport(req.apiUrl, req.passport, req.passphrase);
        let partnerHelper = new req.bridge.Partner(req.apiUrl, req.passport, req.passphrase);

        let res = await authHelper.verifyPassportLoginChallengeResponse(req.body.response, req.body.token, req.body.claimTypes, req.passport.id);
        verify = res.loginResponse;

        //Call the bridge network and find out the details of the passport that logged in
        verify.passportDetails = await passportHelper.getDetails(res.loginResponse.passportId);

        //Call the bridge network to find out about the current verification partners on the network
        //And make sure all of the claims that had a valid signature were also from known verification providers
        verify.unknownSignerClaimTypes = [];

        let verificationPartners = await partnerHelper.getAllPartners();
        for(let i=0; i<verify.claims.length; i++){
            let partner = partnerHelper.getPartnerById(verificationPartners, verify.claims[i].signedById);
            if(!partner)
            {
                verify.unknownSignerClaimTypes.push(verify.claims[i].claimTypeId);
            }
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
        let paymentHelper = new req.bridge.Payment(req.apiUrl, req.passport, req.passphrase);
        request = await paymentHelper.createPaymentRequest(req.body.network, req.body.amount, req.body.address, req.body.identifier);
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

        let passportHelper = new req.bridge.Passport(req.apiUrl, req.passport, req.passphrase);
        let paymentHelper = new req.bridge.Payment(req.apiUrl, req.passport, req.passphrase);
        let res = await paymentHelper.verifyPaymentResponse(req.body.response, req.passport.id);
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
        let claimHelper = new req.bridge.Claim(req.apiUrl, req.passport, req.passphrase);
        //Create the claim packages
        let claimPackages = await claimHelper.createClaimPackages(req.body.publicKey, req.body.claims);
	    //Create the request
        request = await claimHelper.createClaimsImportRequest(claimPackages);
    }
    catch (err) {
        error = err.message;
    }

    res.json({ request, error });
}


module.exports = router;
