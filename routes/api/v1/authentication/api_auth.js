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
const async                             = require('async');

router.use(bodyParser.json({ limit: '500mb' }));
router.use(bodyParser.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));
router.use(express.static(configs.basePublicPath, { maxage: configs.oneDay * 21 }));
router.use(session(configs.appSession));

var getOptions = { source: 'cache' };

router.post('/leo', function(req, res) { 
    console.log(req.body);
    let action = req.body.action;
    if (action == 'email_registration') {
        let email = req.body.email;
        let password = req.body.password;
        let full_name = req.body.full_name;
        let phone_number_string = req.body.phone_number_string;

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

                    const uid = auth.currentUser.uid;

                    // Create user
                    var userObject = {
                        id: randomstring.generate(25),
                        uid: uid,
                        createdAt: new Date(),
                        lastLogin: new Date(),
                        first_name: null,
                        full_name: full_name,
                        last_name: null,
                        preferred_currency: 'USD',
                        initial_setup : false,
                        account_type_id: 10,
                        maximum_events: 3,
                        address_line_1 : null,
                        address_line_2 : null,
                        address_line_3 : null,
                        address_line_4 : null,
                        address_city : null,
                        address_state : null,
                        address_zip_code : null,
                        address_long : null,
                        address_lat : null,
                        address_country: null,
                        address_description: null,
                        bio: null,
                        job_title: null,
                        company_name: null,
                        phone_number_country_code: null,
                        phone_number_area_code: null,
                        phone_number_string: phone_number_string,
                        gender: null,
                        dob: null,
                        user_preferences: [0, 1, 2, 3],
                        card_on_file: false,
                        payment_info_id: new Array(),
                        last_known_checkin_ids: new Array(),
                    }

                    getFirebaseFirStorageInstance(res, function(reference) {
                        let refCollection = reference.collection('users');
                        refCollection.add(userObject).then(function(docRef) {
                            console.log("Document written with ID: ", docRef.id);
                            res.status(200).json({
                                "status": 200,
                                "success": true,
                                "data": {
                                    "uid": auth.currentUser.uid,
                                    "user": userObject
                                },
                                "error_message": null 
                            });
                        }).catch(function (error) {
                            // arrayOfErrors.push(error.message);
                            res.status(200).json({
                                "status": 200,
                                "success": false,
                                "data": null,
                                "error_message": error.message
                            });
                        });
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
                let currentUser = auth.currentUser;
                getFirebaseFirStorageInstance(res, function(reference) {

                    // Get the original user data
                    let refCollection = reference.collection('users');
                    refCollection.where('uid','==', currentUser.uid).get(getOptions).then(function(querySnapshot) {
                        var users = new Array();

                        async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
                            var userDoc = doc.data();
                            userDoc.key = doc.id;

                            // Clean Location
                            userDoc.location = {
                                address_name: userDoc.address_name,
                                address_description: userDoc.address_description,
                                address_line_4: userDoc.address_line_4,
                                address_line_3: userDoc.address_line_3,
                                address_country: userDoc.address_country,
                                address_city: userDoc.address_city,
                                address_line_1: userDoc.addressLine1,
                                address_line_2: userDoc.addressLine2,
                                address_coordinates: {
                                    address_long: userDoc.address_long,
                                    address_lat: userDoc.address_lat,
                                },
                                address_state: userDoc.address_state,
                                address_zip: userDoc.address_zip,
                            }
                            // Get the additional information for user
                            //  Preferences
                            //  Account Type
                            //  Card on File
                            async.parallel({
                                preferences: function(callback) {
                                    var userPreferences = new Array();
                                    async.forEachOf(userDoc.user_preferences, function(preference, key, cb) {
                                        let prefCollection = reference.collection('user_preferences');
                                        prefCollection.where('id','==', preference).get(getOptions).then(function(querysnapshot) {
                                            async.forEachOf(querysnapshot.docs, function(d, k, c) {
                                                var prefdata = d.data();
                                                prefdata.key = d.id;
                                                userPreferences.push(prefdata);
                                                c();
                                            }, function(_e) {
                                                if (_e) { 
                                                    console.log(_e.message);
                                                    cb(_e);
                                                } else {
                                                    cb();
                                                }
                                            });
                                        }).catch(function (error) {
                                            if (error) {
                                                console.log(error.message);
                                                cb(error);
                                            }
                                        });
                                    }, function(e) {
                                        if (e) {
                                            console.error(e.message);
                                            callback(e, null);
                                        } else {
                                            callback(null, userPreferences);
                                        }
                                    });
                                },
                                account_type: function(callback) {
                                    var accountTypes = new Array();
                                    let prefCollection = reference.collection('account_roles');
                                    prefCollection.where('id','==', userDoc.account_type_id).get(getOptions).then(function(querysnapshot) {
                                        async.forEachOf(querysnapshot.docs, function(d, k, c) {
                                            var prefdata = d.data();
                                            prefdata.key = d.id;
                                            accountTypes.push(prefdata);
                                            c();
                                        }, function(_e) {
                                            if (_e) { 
                                                console.log(_e.message);
                                                callback(_e, accountTypes);
                                            } else {
                                                callback(null, accountTypes);
                                            }
                                        });
                                    }).catch(function (error) {
                                        if (error) {
                                            console.log(error.message);
                                            callback(error, null);
                                        }
                                    });
                                }
                            }, function(error, results) {
                                console.log(results);
                                console.log(error);

                                if (error) return res.status(200).json({
                                    "status": 200,
                                    "success": false,
                                    "data": null,
                                    "error_message": error.message
                                });

                                if (results.preferences) {
                                    userDoc.preferences = results.preferences
                                }

                                if (results.account_type) {
                                    userDoc.account_type = results.account_type
                                }

                                users.push(userDoc);
                                completion();
                            });
                        }, function (err) {
                            if (err) return res.status(200).json({
                                "status": 200,
                                "success": false,
                                "data": null,
                                "error_message": error.message
                            });

                            res.status(200).json({
                                "status": 200,
                                "success": true,
                                "data": {
                                    "uid": currentUser.uid,
                                    "user": users
                                },
                                "error_message": null
                            });
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

    if (action == 'forgot_password') {
        let email = req.body.email;

        if (!email) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Email or password are invalid. Please try again."
        });

        getFirebaseAuthInstance(res, function(auth) { 
            auth.sendPasswordResetEmail(emailAddress).then(function() {
                res.status(200).json({
                    "status": 200,
                    "success": true,
                    "data": {
                        "email_sent": true
                    },
                    "error_message": error.message
                });
            }).catch(function(error) {
                // An error happened.
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