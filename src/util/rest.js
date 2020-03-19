const _fetch = require('node-fetch');

class RESTUtil {
    async call(url, securityheader, data) {
        let method = "GET";
        let headers = {
            "securityheader": securityheader
        };
        if (data) {
            method = "POST";
            data = JSON.stringify(data);
            headers = {
                "Content-Type": 'application/json',
                "Content-Length": Buffer.byteLength(data, 'utf8'),
                "securityheader": securityheader
            };
        }

        let options = {
            method: method,
            headers: headers
        };

        if (method == "POST") {
            options.body = data;
        }

        const response = await _fetch(url, options);

        if (response.ok) {
            let text = await response.text();
            if (text.length > 0)
                return JSON.parse(text);
            else
                return true;
        }
        else {
            var error = response.statusText;
            let text = await response.text();
            if (text) {
                var res = JSON.parse(text);
                if (res && res.message)
                    error = res.message;
            }
            else
                text = response.statusText;

            console.log(error);
            return {};
        }
    }
};

exports.RESTUtil = new RESTUtil();