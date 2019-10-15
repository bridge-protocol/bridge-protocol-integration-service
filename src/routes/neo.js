var express = require('express');
var router = express.Router();

//Sub-routes
router.post("/verifyspendtransaction", post_verifySpendTransaction);
router.post("/approveclaimpublish", post_approveClaimPublish);

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

async function post_approveClaimPublish(req, res, next) {
  let claimValid = false;
  let signedTransaction = null;
  let error = null;

  try {
    if (!req.body) {
      throw new Error("Message body was null.");
    }
    if (!req.body.transaction) {
      throw new Error("Missing parameter: transaction");
    }
    if (!req.body.passportId) {
      throw new Error("Missing parameter: passportId");
    }
    if (!req.body.claim) {
      throw new Error("Missing parameter: claim");
    }
    if (!req.body.transaction.transactionParameters) {
      throw new Error("Missing parameter: transactionParameters");
    }
    if (!req.body.transaction.transaction) {
      throw new Error("Missing parameter: transaction");
    }
    if (!req.body.transaction.hash) {
      throw new Error("Missing parameter: hash");
    }

    let claimHelper = new req.bridge.Claim(req.apiUrl, req.passport, req.passphrase);
    let blockchainHelper = new req.bridge.Blockchain(req.apiUrl, req.passport, req.passphrase);

    //Verify the claim signature
    let claim = claimHelper.getClaimObject(req.body.claim);
    let transaction = req.body.transaction;
    let verifiedSignature = await claimHelper.verifyClaimSignature(claim, req.body.passportId);
    if (!verifiedSignature) {
      throw new Error("Claim signature verification failed.");
    }

    if (!transaction.transactionParameters.scriptParams.args || transaction.transactionParameters.scriptParams.args.length < 6) {
      throw new Error("Transaction missing scriptParams or arguments.");
    }
    let transactionClaimTypeId = transaction.transactionParameters.scriptParams.args[2];
    let transactionClaimValue = transaction.transactionParameters.scriptParams.args[3];
    transactionClaimValue = req.bridge.Crypto.hexDecode(transactionClaimValue);
    let transactionCreatedOn = transaction.transactionParameters.scriptParams.args[4];

    if (claim.claimTypeId === transactionClaimTypeId &&
      claim.claimValue === transactionClaimValue &&
      claim.createdOn === transactionCreatedOn) {
      claimValid = true;
    }

    if (!claimValid) {
      throw new Error("Transaction data does not match signed claim data.");
    }

    let wif = await blockchainHelper.getPrivateKey("NEO", req.passport.wallets[0].key);
    signedTransaction = req.bridge.NEOUtility.secondarySignTransaction(transaction.transactionParameters, transaction.transaction, transaction.hash, wif);
  }
  catch (err) {
    error = err.message;
  }

  return res.json({ signedTransaction, error });
}

module.exports = router;
