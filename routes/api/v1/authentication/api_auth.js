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

router.use(bodyParser.json({ limit: '500mb' }));
router.use(bodyParser.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));
router.use(express.static(configs.basePublicPath, { maxage: configs.oneDay * 21 }));
router.use(session(configs.appSession));

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
router.post('/leo', function(req, res) { 
    console.log(req.body);
    let action = req.body.action;
    if (action == 'email_registration') {
        console.log()
        let email = req.body.email;
        let password = req.body.password;

        if (!email || !password) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Email or password are invalid. Please try again."
        });

        getFirebaseAuthInstance(res, function(auth){ 
            auth.signOut().then(function() {
                auth.createUserWithEmailAndPassword(email, password).then(function () {
                    if (!auth.currentUser) return res.status(200).json({
                        "status": 200,
                        "success": false,
                        "data": null,
                        "error_message": "Sorry! Something went wrong. Please try again later." 
                    });
                    res.status(200).json({
                        "status": 200,
                        "success": true,
                        "data": {
                            "uid": auth.currentUser.uid
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
        });
    }

    if (action == 'update_user') {
        console.log('update_user');
    }

    if (action == 'email_login') {
        let email = req.body.email;
        let password = req.body.password;

        if (!email || !password) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Email or password are invalid. Please try again."
        });

        getFirebaseAuthInstance(res, function(auth){ 
            auth.signInWithEmailAndPassword(email, password).then(function(error) {
                let user = auth.currentUser;
                if (user) {
                    res.status(200).json({
                        "status": 200,
                        "success": true,
                        "data": {
                            "uid": user.uid
                        },
                        "error_message": null
                    });
                } else {
                    res.status(200).json({
                        "status": 200,
                        "success": false,
                        "data": null,
                        "error_message": "There is no account with that email address. Please try again." 
                    });
                }
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

module.exports = router;