const express                           = require('express');
const path                              = require('path');
const router                            = express.Router();
const main                              = require('../../../../app');
const configs                           = require('../../../../configs');
const bodyParser                        = require('body-parser');
const session                           = require('client-sessions');
const formidable                        = require('formidable');
const _                                 = require('underscore');
const mime                              = require('mime');
const randomstring                      = require('randomstring');

router.use(bodyParser.json({ limit: '500mb' }));
router.use(bodyParser.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));
router.use(express.static(configs.basePublicPath, { maxage: configs.oneDay * 21 }));
router.use(session(configs.appSession));

router.post('/eggman', function(req, res) { 
    console.log(req.body);
    let action = req.body.action;
    if (action == 'update_user') {
        getFirebaseFirStorageInstance(res, function(reference) {
            let refCollection = reference.collection('users');
            let data = JSON.parse(req.body.data);

            doc(req.body.uid).set(data, { merge: true }).then(function() {
                res.status(200).json({
                    "status": 200,
                    "success": true,
                    "data": {
                        "uid": req.body.uid
                    },
                    "error_message": null 
                });
            }).catch(function (error) {
                res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": error.message
                });
            });
        });
    }
}); 

function getFirebaseAuthInstance(res, callback) {
    main.firebase(function(firebase) {
        if (!firebase) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Sorry! Something went wrong. Please try again later." 
        });

        firebase.firebase_auth(function(auth) {
            if (!auth) return res.status(200).json({
                "status": 200,
                "success": false,
                "data": null,
                "error_message": "Sorry! Something went wrong. Please try again later." 
            });

            callback(auth);
        });
    });
}

function getFirebaseFirStorageInstance(res, callback) {
    main.firebase(function(firebase) {
        if (!firebase) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Sorry! Something went wrong. Please try again later." 
        });

        firebase.firebase_firestore_db(function(reference) {
            if (!reference) return res.status(200).json({
                "status": 200,
                "success": false,
                "data": null,
                "error_message": "Sorry! Something went wrong. Please try again later." 
            });

            callback(reference);
        });
    });
}

module.exports = router;