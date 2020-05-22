const express                           = require('express');
const path                              = require('path');
const router                            = express.Router();
const configs                           = require('../../../../configs');
const bodyParser                        = require('body-parser');
const session                           = require('client-sessions');
const formidable                        = require('formidable');
const _                                 = require('underscore');
const mime                              = require('mime');

router.use(bodyParser.json({ limit: '500mb' }));
router.use(bodyParser.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));
router.use(express.static(configs.basePublicPath, { maxage: configs.oneDay * 21 }));
router.use(session(configs.appSession));

router.post('/pablo', function(req, res) { 
    console.log(req.body);
    res.status(200).json({
        "status": 200,
        "success": { 
            "result" : true, 
            "message" : "Sorry, but you're not allowed to be here. GO AWAY!" 
        },
        "data": null,
        "error": null
    });
}); 

module.exports = router;