const express                           = require('express');
const configs                           = require('../../../configs');
const path                              = require('path');
const router                            = express.Router();
const bodyParser                        = require('body-parser');
const session                           = require('client-sessions');
const _                                 = require('underscore');

router.use(bodyParser.json({ limit: '500mb' }));
router.use(bodyParser.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));
router.use(express.static(configs.basePublicPath, { maxage: configs.oneDay * 21 }));
router.use(session(configs.appSession));

// This is the primary UI
router.get('/', function(req, res) {

    let session = req.Rootedap93w8htrse4oe89gh9ows4t;
    let sessionCheckValue = !(_.isEmpty(session)) && (session !== null || typeof session !== 'undefined')
  
    if (sessionCheckValue) {
        res.status('200').render('#', {
            "message" : "Test POST request.",
            "page" : {
                "title": configs.siteTitle,
                "session": {
                    "isSessionActive": sessionCheckValue,
                    "data": req.Rootedap93w8htrse4oe89gh9ows4t
                }
            }
        });
    } else {
        res.status('200').render('#', {
            "message" : "Test POST request.",
            "page" : {
                "title": configs.siteTitle,
                "session": {
                    "isSessionActive": sessionCheckValue,
                    "data": req.Rootedap93w8htrse4oe89gh9ows4t
                }
            }
        });
    }
});

module.exports = router;