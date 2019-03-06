const _fetch = require('node-fetch');
const _config = require('../src/config.json');

async function Init(){
    let serviceUrl = "http://localhost:" + _config.port;
    let options = {
        method: "GET",
        headers: {
            "securityheader": _config.securityHeaderValue
        }
    };

    //Get the server version
    let res = await _fetch(serviceUrl + "/version", options);
    let obj = JSON.parse(await res.text());
    if(obj.error)
    {
        console.log("Error:" + obj.error);
        return;
    }
    let version = obj.version;
    console.log("Version: " + version);

    //Get the server passport id
    res = await _fetch(serviceUrl + "/passport/id", options);
    obj = JSON.parse(await res.text());
    if(obj.error)
    {
        console.log("Error:" + obj.error);
        return;
    }
    let passportId = obj.passportId;
    console.log("Passport Id: " + passportId);

    //Get the server public key
    res = await _fetch(serviceUrl + "/passport/publickey", options);
    obj = JSON.parse(await res.text());
    if(obj.error)
    {
        console.log("Error:" + obj.error);
        return;
    }
    let publicKey = obj.publicKey;
    console.log("Passport Public Key: " + publicKey);
}

Init();