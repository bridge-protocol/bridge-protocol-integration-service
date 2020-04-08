var express = require('express');
var router = express.Router();

//Sub-routes
router.post("/walletaddress", post_walletAddress);
router.post("/sendpayment", post_sendPayment);
router.post("/verifypayment", post_verifyPayment);
router.post("/approveclaimpublish", post_approveClaimPublish);

async function post_walletAddress(req, res, next){
  let error = null;
  let response = null;

  try {
    if (!req.body) {
      throw new Error("Message body was null.");
    }
    if(!req.body.network){
      throw new Error("Missing parameter: network");
    }

    let wallet = await req.passport.getWalletForNetwork(req.body.network);
    if(wallet)
      response = wallet.address;
  }
  catch (err) {
    error = err.message;
  }

  return res.json({ response, error });
}

async function post_sendPayment(req, res, next){
  let error = null;
  let response = null;

  try {
    if (!req.body) {
      throw new Error("Message body was null.");
    }
    if(!req.body.network){
      throw new Error("Missing parameter: network");
    }
    if(!req.body.to){
      throw new Error("Missing parameter: to");
    }
    if(!req.body.amount) {
      throw new Error("Missing parameter: amount");
    }
    if (!req.body.identifier) {
      throw new Error("Missing parameter: identifier");
    }

    let wallet = await req.passport.getWalletForNetwork(req.body.network);
    await wallet.unlock(req.passphrase);
    if(!wallet || !wallet.unlocked)
      throw new Error("Could not find or unlock " + req.body.network + " wallet");

    response = await req.bridge.Services.Blockchain.sendPayment(wallet, req.body.amount, req.body.to, req.body.identifier, req.body.wait);
  }
  catch (err) {
    error = err.message;
  }

  return res.json({ response, error });
}

async function post_verifyPayment(req, res, next) {
  let response = null;
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
    if (!req.body.identifier) {
      throw new Error("Missing parameter: identifier");
    }

    response = await req.bridge.Services.Blockchain.verifyPayment(req.body.network, req.body.txid, req.body.from, req.body.to, req.body.amount, req.body.identifier);
  }
  catch (err) {
    error = err.message;
  }

  return res.json({ response, error });
}

//Bridge Use Only.  Smart Contract will only accept Transactions from Bridge Addresses
//For NEO we create a transaction to be signed by the user and relayed by them
//For ETH we execute a transaction to approve the publish after they already sent a publish transaction
async function post_approveClaimPublish(req, res, next) {
  let error = null;
  let response = null;

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

    let claim = new req.bridge.Models.Claim(req.body.claim);
    if (!claim.verifySignature(req.body.passportId)) {
      throw new Error("Claim signature verification failed.");
    }

    let wallet = await req.passport.getWalletForNetwork(req.body.network);

    //For ethereum we need to be sure we were paid for the publish
    if(req.body.network.toLowerCase() === "eth"){
      if(!req.body.transactionId){
        throw new Error("Missing parameter: transactionId")
      }

      //Get the publish approve cost
      let approveCost = await req.bridge.Services.Blockchain.approveClaimPublish(wallet, req.body.address, claim, req.body.hashOnly, true);
      
      //Verify we've been paid for the publish
      let paid = await req.bridge.Services.Blockchain.verifyGasTransfer(req.body.network, req.body.transactionId, req.body.address, req.bridge.Constants.bridgeEthereumAddress, approveCost, claim.identifier);
      if(!paid)
        throw new Error("Could not verify gas payment transaction.");
    }

    await wallet.unlock(req.passphrase);
    if(!wallet || !wallet.unlocked)
      throw new Error("Could not find or unlock " + req.body.network + " wallet");

    //If the claim is valid, give them a claim to publish
    response = await req.bridge.Services.Blockchain.approveClaimPublish(wallet, req.body.address, claim, req.body.hashOnly);
  }
  catch (err) {
    error = err.message;
  }

  return res.json({ response, error });
}

module.exports = router;
