const _fetch = require('node-fetch');
const _config = require('../src/config.json');

async function Init(){
    let serviceUrl = "http://localhost:" + _config.port;

    //The verification request / application id
    let applicationId = "12345";

    //The application status
    //InProgress = 2,
    //Complete = 3,
    //Rejected = 5,
    let status = 3; //Complete

    //Post JSON data
    let data = JSON.stringify({ applicationId, status });

    let options = {
        method: "POST",
        body: data,
        headers: {
            "Content-Type": 'application/json',
            "Content-Length": Buffer.byteLength(data, 'utf8'),
            "securityheader": _config.securityHeaderValue
        }
    };

    //Send the status to be set on the application
    let res = await _fetch(serviceUrl + "/application/setstatus", options);
    let obj = JSON.parse(await res.text());
    if(obj.error)
    {
        console.log("Error:" + obj.error);
        return;
    }
}

Init();