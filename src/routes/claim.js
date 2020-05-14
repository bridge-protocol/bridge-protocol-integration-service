
var express = require('express');
var router = express.Router();

//Sub-routes
router.post("/verifysignature", post_verifySignature);

async function post_verifySignature(req, res) {
    let error = null;
    let response = false;

    if (!req.body) {
        throw new Error("Message body was null.");
    }
    if (!req.body.claim) {
        throw new Error("Missing parameter: claim");
    }
    if(!req.body.passportId){
        throw new Error("Missing parameter: passportId");
    }

    try {
        let claim = new req.bridge.Models.Claim(req.body.claim);
        if (claim.verifySignature(req.body.passportId)) {
            response = true;
        }
    }
    catch (err) {
        error = err.message;
    }

    res.json({ response, error });
}


module.exports = router;
