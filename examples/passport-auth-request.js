const _fetch = require('node-fetch');
const _config = require('../src/config.json');

async function Init(){
    let serviceUrl = "http://localhost:" + _config.port;

    //Generate a random signing token
    let signingToken = "randomsigningtoken";

    //Decide what type of claim types you require them to provide (can be null for no required claim type)
    let claimTypes = [ 3 ];

    //Post JSON data
    let data = JSON.stringify({ signingToken, claimTypes });

    let options = {
        method: "POST",
        body: data,
        headers: {
            "Content-Type": 'application/json',
            "Content-Length": Buffer.byteLength(data, 'utf8'),
            "securityheader": _config.securityHeaderValue
        }
    };

    //Get the passport request payload
    let res = await _fetch(serviceUrl + "/passport/requestlogin", options);
    let obj = JSON.parse(await res.text());
    if(obj.error)
    {
        console.log("Error:" + obj.error);
        return;
    }
    let request = obj.request;

    console.log("Passport Auth Request:");
    console.log(request);
}

Init();