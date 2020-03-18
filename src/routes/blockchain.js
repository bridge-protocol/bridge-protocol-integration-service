var express = require('express');
var router = express.Router();

//Sub-routes
router.post("/verifypayment", post_verifyPayment);
router.post("/createaddclaimtransaction", post_approveClaimPublish);
router.post("/approveclaimpublish", post_approveClaimPublish);

async function post_verifyPayment(req, res, next) {
  let verified = false;
  let complete = false;
  let error = null;

  try {
    if (!req.body) {
      throw new Error("Message body was null.");
    }
    if(!req.body.network){
      throw new Error("Missing parameter: network");
    }
    if (!req.body.txid) {
      throw new Error("Missing parameter: txid");
    }
    if(!req.body.from){
      throw new Error("Missing parameter: from");
    }
    if(!req.body.to){
      throw new Error("Missing parameter: to");
    }
    if (!req.body.amount) {
      throw new Error("Missing parameter: amount");
    }
    if (!req.body.paymentIdentifier) {
      throw new Error("Missing parameter: paymentIdentifier");
    }

    var res = await req.bridge.Services.Blockchain.verifyPayment(req.body.network, req.body.txid, req.body.from, req.body.to, req.body.amount, req.body.paymentIdentifier);
    verified = res.success;
    complete = res.complete;
  }
  catch (err) {
    error = err.message;
  }
  return res.json({ verified, complete, error });
}

//Bridge Use Only.  Smart Contract will only accept Transactions from Bridge Addresses
//For NEO we create a transaction to be signed by the user and relayed by them
//For ETH we execute a transaction to approve the publish after they already sent a publish transaction
async function post_approveClaimPublish(req, res, next) {
  let error = null;
  let transaction = null;

  try {
    if (!req.body) {
      throw new Error("Message body was null.");
    }
    if(!req.body.network){
      throw new Error("Missing parameter: network");
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

    let claim = new bridge.Models.Claim(req.body.claim);
    if (!claim.verifySignature(req.body.passportId)) {
      throw new Error("Claim signature verification failed.");
    }

    let wallet = await req.passport.getWalletForNetwork(req.body.network);
    await wallet.unlock(req.passphrase);
    if(!wallet || !wallet.unlocked)
      throw new Error("Could not find or unlock " + req.body.network + " wallet");

    //If the claim is valid, give them a claim to publish
    transaction = await req.bridge.Services.Blockchain.approveClaimPublish(wallet, req.body.address, claim, req.body.hashOnly)
  }
  catch (err) {
    error = err.message;
  }

  return res.json({ transaction, error });
}

module.exports = router;
