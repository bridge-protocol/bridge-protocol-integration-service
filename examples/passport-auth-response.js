const _fetch = require('node-fetch');
const _config = require('../src/config.json');

async function Init(){
    let serviceUrl = "http://localhost:" + _config.port;

    //The user's response payload
    let response = "userresponse";
    
    //The token we provided the user with the auth request 
    let token = "randomsigningtoken";

    //Post JSON data
    let data = JSON.stringify({ response, token });

    let options = {
        method: "POST",
        body: data,
        headers: {
            "Content-Type": 'application/json',
            "Content-Length": Buffer.byteLength(data, 'utf8'),
            "securityheader": _config.securityHeaderValue
        }
    };

    //Send the passport auth response payload
    let res = await _fetch(serviceUrl + "/passport/verifylogin", options);
    let obj = JSON.parse(await res.text());
    if(obj.error)
    {
        console.log("Error:" + obj.error);
        return;
    }
    let verify = obj.verify;

    console.log("Passport Auth Response Verification:");
    console.log(verify);
}

Init();