const _fetch = require('node-fetch');
const _config = require('../src/config.json');

async function Init(){
    let serviceUrl = "http://localhost:" + _config.port;

    //The verification request / application id
    let applicationId = "applicationid";

    //The application users passportId
    let passportId = "userpassportidfromapplication";

    //The application users publicKey
    let publicKey = "userpublickeyfromapplication";

    //The collection of claims packages created from
    let claims = [];

    //Add a claim for verified email address
    claims.push({
        claimTypeId: 3,
        claimValue: "someuser@bridgeprotocol.io",
        createdOn: 1551180491,
        expiresOn: 1553580491
    });

    //Post JSON data
    let data = JSON.stringify({ applicationId, publicKey, claims });

    let options = {
        method: "POST",
        body: data,
        headers: {
            "Content-Type": 'application/json',
            "Content-Length": Buffer.byteLength(data, 'utf8'),
            "securityheader": _config.securityHeaderValue
        }
    };

    //Send the claims
    let res = await _fetch(serviceUrl + "/application/addclaims", options);
    let obj = JSON.parse(await res.text());
    if(obj.error)
    {
        console.log("Error:" + obj.error);
        return;
    }
}

Init();