var express = require('express');
var router = express.Router();

//Sub-routes
router.post("/verifyspendtransaction", post_verifySpendTransaction);
router.post("/claimaddtransaction", post_claimAddTransaction);

async function post_verifySpendTransaction(req, res, next) {
  //txid, amount, recipient, identifier
  let verified = false;
  let complete = false;
  let error = null;

  try {
    if (!req.body) {
      throw new Error("Message body was null.");
    }
    if (!req.body.txid) {
      throw new Error("Missing parameter: txid");
    }
    if (!req.body.amount) {
      throw new Error("Missing parameter: amount");
    }

    var info = await req.bridge.NEOUtility.verifySpendTransaction(req.body.txid, req.body.amount, req.body.recipient, req.body.identifier);
    verified = info.success;
    complete = info.complete;
  }
  catch (err) {
    error = err.message;
  }
  return res.json({ verified, complete, error });
}

async function post_claimAddTransaction(req, res, next) {
  let error = null;
  let transaction = null;

  try {
    if (!req.body) {
      throw new Error("Message body was null.");
    }
    if(!req.body.passportId){
      throw new Error("Missing parameter: passportId");
    }
    if(!req.body.address){
      throw new Error("Missing parameter: address");
    }
    if (!req.body.claim) {
      throw new Error("Missing parameter: claim");
    }

    //Verify the claim signature
    let claimHelper = new req.bridge.Claim(req.apiUrl, req.passport, req.passphrase);
    let claim = claimHelper.getClaimObject(req.body.claim);
    let verifiedSignature = await claimHelper.verifyClaimSignature(claim, req.body.passportId);
    if (!verifiedSignature) {
      throw new Error("Claim signature verification failed.");
    }

    //If the claim is valid, give them a claim to publish
    transaction = await req.bridge.NEOUtility.getAddClaimTransaction(claim, req.passport, req.passphrase, req.body.passportId, req.body.address, req.body.hashOnly);
  }
  catch (err) {
    error = err.message;
  }

  return res.json({ transaction, error });
}

module.exports = router;
