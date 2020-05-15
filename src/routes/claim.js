
var express = require('express');
var router = express.Router();

//Sub-routes
router.post("/verifysignature", post_verifySignature);

async function post_verifySignature(req, res) {
    let error = null;
    let response = false;

    try {
        if (!req.body) {
            throw new Error("Message body was null.");
        }
        if (!req.body.claim) {
            throw new Error("Missing parameter: claim");
        }
        if(!req.body.passportId){
            throw new Error("Missing parameter: passportId");
        }

        let claim = new req.bridge.Models.Claim(req.body.claim);
        let res = await claim.verifySignature(req.body.passportId);
        if(res != null && res != false)
            response = true;
    }
    catch (err) {
        error = err.message;
    }

    res.json({ response, error });
}


module.exports = router;
