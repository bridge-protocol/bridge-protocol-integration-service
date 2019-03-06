const _fetch = require('node-fetch');
const _config = require('../src/config.json');

async function Init() {
    let serviceUrl = "http://localhost:" + _config.port;
    let options = {
        method: "GET",
        headers: {
            "securityheader": _config.securityHeaderValue
        }
    };

    //Get the Bridge Protocol Network Profile Types
    let res = await _fetch(serviceUrl + "/profile/types", options);
    let obj = JSON.parse(await res.text());
    if (obj.error) {
        console.log("Error:" + obj.error);
        return;
    }
    let profileTypes = obj.profileTypes;
    console.log("Profile Types:");
    console.log(JSON.stringify(profileTypes));

    //Get the Bridge Protocol Network Claim Types
    res = await _fetch(serviceUrl + "/claim/types", options);
    obj = JSON.parse(await res.text());
    if (obj.error) {
        console.log("Error:" + obj.error);
        return;
    }
    let claimTypes = obj.claimTypes;
    console.log("Claim Types:");
    console.log(JSON.stringify(claimTypes));
}

Init();