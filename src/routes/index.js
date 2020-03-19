var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Bridge Protocol Integration Service', version: req.version });
});

//Sub-routes
router.get("/claim/types", get_claimTypes);
router.get("/profile/types", get_profileTypes);

async function get_claimTypes(req, res) {
    let error = null;
    let claimTypes = null;

    try {
        claimTypes = await req.bridge.Services.Claim.getAllTypes();
    }
    catch (err) {
        error = _getError(err.message);
    }

    res.json({ claimTypes, error });
}

async function get_profileTypes(req, res) {
    let error = null;
    let profileTypes = null;

    try {
        profileTypes = await req.bridge.Services.Profile.getAllTypes();
    }
    catch (err) {
        error = _getError(err.message);
    }

    res.json({ profileTypes, error });
}


module.exports = router;
