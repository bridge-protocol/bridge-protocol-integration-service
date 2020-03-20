const _fs = require('fs');
const _path = require('path');
const _bridge = require('../../bridge-protocol-js/src/index');
const _rest = require('../src/util/rest').RESTUtil;
const _config = require('../src/config.json');

const _apiBase = "http://localhost:3000";
const _password = "0123456789";

async function Init(){
    //Load a test passport
    let passport = new _bridge.Models.Passport();
    await passport.openFile("./test-passport.json", _password);

    console.log("- Get claim types - /claim/types");
    let claimTypes = await callEndpoint("/claim/types");
    console.log(JSON.stringify(claimTypes.response));
    console.log("");

    console.log("- Get profile types - /profile/types");
    let profileTypes = await callEndpoint("/profile/types");
    console.log(JSON.stringify(profileTypes.response));
    console.log("");

    console.log("- Get passport Id - /passport/id");
    let passportId = await callEndpoint("/passport/id");
    console.log(passportId.response);
    console.log("");

    console.log("- Get passport details - /passport/details");
    let passportDetails = await callEndpoint("/passport/details", { passportId });
    console.log(JSON.stringify(passportDetails.response));
    console.log("");

    console.log("- Get public key - /passport/publicKey");
    let publicKey = await callEndpoint("/passport/publicKey");
    publicKey = publicKey.response;
    console.log(publicKey);
    console.log("");

    console.log("- Get id from public key - /passport/idfromkey");
    let idFromKey = await callEndpoint("/passport/idfromkey", { publicKey });
    console.log(idFromKey.response);
    console.log("");

    let message = "test message here";
    console.log("- Sign message - /passport/sign");
    let signature = await callEndpoint("/passport/sign", { message });
    signature = signature.response;
    console.log(signature);
    console.log("");

    console.log("- Verify signed message - /passport/verify");
    let verifiedSignature = await callEndpoint("/passport/verify", { signature, publicKey });
    console.log(verifiedSignature.response);
    console.log("");

    console.log("- Verify hash - /passport/verifyhash");
    let hash = _bridge.Utils.Crypto.getHash(message);
    let verifiedHash = await callEndpoint("/passport/verifyhash", { message, hash });
    console.log(verifiedHash.response);
    console.log("");

    console.log("- Encrypt message - /passport/encrypt");
    let encrypted = await callEndpoint("/passport/encrypt", { message, publicKey });
    encrypted = encrypted.response;
    console.log(encrypted);
    console.log("");

    console.log("- Decrypt message - /passport/decrypt");
    let decrypted = await callEndpoint("/passport/decrypt", { encrypted, publicKey });
    decrypted = decrypted.response;
    console.log(decrypted);
    console.log("");

    console.log("- Request claims import - /passport/requestclaimsimport");
    let newClaims = getClaims(passport);
    let claimImportRequest = await callEndpoint("/passport/requestclaimsimport", { claims: newClaims, publicKey: passport.publicKey });
    claimImportRequest = claimImportRequest.response;
    console.log(claimImportRequest);
    console.log("");

    console.log("- Verify claim import request");
    let verifiedClaimImportRequest = await _bridge.Messaging.Claim.verifyClaimsImportRequest(claimImportRequest);
    console.log(JSON.stringify(verifiedClaimImportRequest));
    console.log("");

    //Verify and import the claims
    let importClaims = await _bridge.Utils.Claim.verifyClaimPackagesForImport(passport, _password, verifiedClaimImportRequest.payload.claimPackages);
    passport.claims = importClaims;

    let token = "12345";
    console.log("- Request auth - /passport/requestauth");
    let authRequest = await callEndpoint("/passport/requestauth", { token, claimTypes:["3"], networks:["neo","eth"] });
    authRequest = authRequest.response;
    console.log(authRequest);
    console.log("");

    console.log("- Create passport auth response");
    let verifiedAuthRequest = await _bridge.Messaging.Auth.verifyPassportChallengeRequest(authRequest);
    let claims = await passport.getDecryptedClaims(verifiedAuthRequest.payload.claimTypes, _password);
    let addresses = passport.getWalletAddresses(verifiedAuthRequest.payload.networks);
    let response = await _bridge.Messaging.Auth.createPassportChallengeResponse(passport, _password, verifiedAuthRequest.publicKey, verifiedAuthRequest.payload.token, claims, addresses);
    console.log(response);
    console.log("");

    console.log("- Verify auth - /passport/verifyauth")
    let verify = await callEndpoint("/passport/verifyauth", { response, token });
    console.log(JSON.stringify(verify.response));
    console.log("");

    console.log("- Create payment reuqest - /passport/requestpayment");
    let paymentRequest = await callEndpoint("/passport/requestpayment", { network: "neo", amount: 1, address: passport.getWalletForNetwork("neo").address, identifier: "12345" });
    paymentRequest = paymentRequest.response;
    console.log(JSON.stringify(paymentRequest));
    console.log("");

    console.log("- Verify payment request");
    let verifiedPaymentRequest = await _bridge.Messaging.Payment.verifyPaymentRequest(paymentRequest);
    console.log(JSON.stringify(verifiedPaymentRequest));
    console.log("");

    console.log("- Create payment response");
    let wallet = passport.getWalletForNetwork("neo");
    let paymentResponse = await _bridge.Messaging.Payment.createPaymentResponse(passport, _password, wallet.network, wallet.address, 1, wallet.address, "12345", "Transaction12345", publicKey);
    console.log(paymentResponse);
    console.log("");

    console.log("- Verify payment response - /passport/verifypayment");
    let verifiedPaymentResponse = await callEndpoint("/passport/verifypayment", { response: paymentResponse });
    console.log(JSON.stringify(verifiedPaymentResponse.response));
    console.log("");

    let neoWallet = passport.getWalletForNetwork("neo");
    let ethWallet = passport.getWalletForNetwork("eth");
    let claim = await passport.getDecryptedClaim("3", _password);

    console.log("- Verify blockchain payment - /blockchain/verifypayment");
    let verifiedPayment = await callEndpoint("/blockchain/verifypayment", { network: neoWallet.network, txid: "12345", from: neoWallet.address, to: neoWallet.address, amount: 1, identifier:"12345" });
    console.log(JSON.stringify(verifiedPayment));
    console.log("");

    console.log("- Create NEO claim publish transaction - /blockchain/createclaimpublish");
    let claimPublishTransaction = await callEndpoint("/blockchain/createclaimpublish", { network: neoWallet.network, passportId: passport.id, address: neoWallet.address, claim});
    console.log(JSON.stringify(claimPublishTransaction, ));
    console.log("");

    console.log("- Approve ETH claim publish transaction - /blockchain/createclaimpublish");
    let claimPublishApprove = await callEndpoint("/blockchain/approveclaimpublish", { network: ethWallet.network, passportId: passport.id, address: ethWallet.address, claim});
    console.log(JSON.stringify(claimPublishApprove));
    console.log("");
}

async function callEndpoint(path, data){
    return await _rest.call(`${_apiBase}${path}`, _config.securityHeaderValue, data);
}

function getClaims(passport){
    //Include some unknown signer claim packages (signed by ourself)
    let claim = new _bridge.Models.Claim({
        claimTypeId: 3,
        claimValue: "someuser@bridgeprotocol.io",
        createdOn: 1551180491,
        expiresOn: 0 //Never expires
    });
    console.log("Claim Created:");
    console.log(JSON.stringify(claim));

    return [claim];
}

Init(); 