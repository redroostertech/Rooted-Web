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
const moment                            = require('moment');
const jwt                               = require('jsonwebtoken');

var oneDay = process.env.oneDay || configs.oneDay;
var jwtsecret = process.env.jwtsecret || configs.jwtsecret;
var jwtsecretLimit = process.env.jwtsecretLimit || configs.jwtsecretLimit;
var jwtrefresh = process.env.jwtrefresh || configs.jwtrefresh;
var jwtrefreshLimit = process.env.jwtrefreshLimit || configs.jwtrefreshLimit;

router.use(bodyParser.json({ limit: '500mb' }));
router.use(bodyParser.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));
router.use(express.static(configs.basePublicPath, { maxage: configs.oneDay * 21 }));
router.use(session(configs.appSession));

var getOptions = { source: 'cache' };

var activeFunctions = [
    'email_login',
    'email_registration',
    'forgot_password',
    'google_registration',
    'log_out', 
    'phone_registration',
    'session_check',
]

router.post('/leo', function(req, res) { 
    console.log(req.body);
    let action = req.body.action;

    if (!activeFunctions.includes(action)) {
        return res.status(404).json({
            "status": 404,
            "success": false,
            "data": null,
            "error_message": "Something went wrong. Please try again."
        });
    }
    
    if (action == 'email_registration') {
        let email = req.body.email;
        let password = req.body.password;
        let full_name = req.body.full_name;
        let phone_number_string = req.body.phone_number_string;
        let public_key_string = req.body.public_key_string;
        let private_key_encrypted_string = req.body.private_key_encrypted_string;

        if (!email || !password || !full_name || !phone_number_string || !public_key_string || !private_key_encrypted_string) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
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

                    console.log(uid); 

                    jwt.sign({ 
                        uid: uid 
                    }, 
                    jwtrefresh, 
                    {
                        expiresIn: jwtrefreshLimit
                    }, function(err, customToken) {
                        if (err) return res.status(200).json({
                            "status": 200,
                            "success": false,
                            "data": null,
                            "error_message": err.message
                        });
                        // Create user
                        var userObject = {
                            id: randomstring.generate(25),
                            email_address: email,
                            uid: uid,
                            token: customToken,
                            public_key_string: public_key_string,
                            private_key_encrypted_string: private_key_encrypted_string,
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
                            login_type: 'EMAIL'
                        }

                        console.log(userObject);

                        getFirebaseFirStorageInstance(res, function(reference) {
                            console.log(userObject);
                            let refCollection = reference.collection('users');
                            refCollection.doc(uid).set(userObject).then(function(docRef) {
                                console.log("Document written with ID: ", docRef.id);
                                retrieveUserObject(auth.currentUser.uid, reference, function(error, data) {
                                    if (error) return res.status(200).json({
                                        "status": 200,
                                        "success": false,
                                        "data": null,
                                        "error_message": error.message
                                    });
            
                                    res.status(200).json({
                                        "status": 200,
                                        "success": true,
                                        "data": data,
                                        "error_message": null
                                    });
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

                    })
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

    if (action == 'google_registration') {
        let email = req.body.email;
        let full_name = req.body.full_name;
        let public_key_string = req.body.public_key_string;
        let private_key_encrypted_string = req.body.private_key_encrypted_string;
        let uid = req.body.uid;

        if (!email || !full_name || !uid) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveUserObject(uid, reference, function(error, data) {
                if (error) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": "Email or password are invalid. Please try again."
                });
                
                jwt.sign({ 
                    uid: uid 
                }, 
                jwtrefresh, 
                {
                    expiresIn: jwtrefreshLimit
                }, function(err, customToken) {
                    if (err) return res.status(200).json({
                        "status": 200,
                        "success": false,
                        "data": null,
                        "error_message": err.message
                    });

                    if (typeof data.user[0] == 'undefined') {

                        // Create user
                        var userObject = {
                            id: randomstring.generate(25),
                            email_address: email,
                            uid: uid,
                            token: customToken,
                            public_key_string: public_key_string,
                            private_key_encrypted_string: private_key_encrypted_string,
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
                            phone_number_string: null,
                            gender: null,
                            dob: null,
                            user_preferences: [0, 1, 2, 3],
                            card_on_file: false,
                            payment_info_id: new Array(),
                            last_known_checkin_ids: new Array(),
                            login_type: 'GOOGLE'
                        }

                        getFirebaseFirStorageInstance(res, function(ref) {
                            let refCollection = ref.collection('users');
                            refCollection.doc(uid).set(userObject).then(function(docRef) {
                                console.log("Document written with ID: ", docRef.id);
                                retrieveUserObject(uid, ref, function(error, data) {
                                    if (error) return res.status(200).json({
                                        "status": 200,
                                        "success": false,
                                        "data": null,
                                        "error_message": error.message
                                    });
            
                                    res.status(200).json({
                                        "status": 200,
                                        "success": true,
                                        "data": data,
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
                    } else {
                        data.user[0].email_address = email;
                        data.user[0].token = customToken;
                        
                        res.status(200).json({
                            "status": 200,
                            "success": true,
                            "data": data,
                            "error_message": null
                        });
                    }
                });
            });
        });
    }

    if (action == 'phone_registration') {
        let phone_number = req.body.phone_number;
        let public_key_string = req.body.public_key_string;
        let private_key_encrypted_string = req.body.private_key_encrypted_string;
        let uid = req.body.uid;

        if (!phone_number || !uid) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveUserObject(uid, reference, function(error, data) {
                if (error) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": error.message
                });
                jwt.sign({ 
                    uid: uid 
                }, 
                jwtrefresh, 
                {
                    expiresIn: jwtrefreshLimit
                }, function(err, customToken) {
                    if (err) return res.status(200).json({
                        "status": 200,
                        "success": false,
                        "data": null,
                        "error_message": err.message
                    });
                    if (data.user.length == 0) {
                        // Create user
                        var userObject = {
                            id: randomstring.generate(25),
                            email_address: null,
                            uid: uid,
                            token: customToken,
                            public_key_string: public_key_string,
                            private_key_encrypted_string: private_key_encrypted_string,
                            createdAt: new Date(),
                            lastLogin: new Date(),
                            first_name: null,
                            full_name: null,
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
                            phone_number_string: phone_number,
                            gender: null,
                            dob: null,
                            user_preferences: [0, 1, 2, 3],
                            card_on_file: false,
                            payment_info_id: new Array(),
                            last_known_checkin_ids: new Array(),
                            login_type: 'PHONE'
                        }
                        saveUserObject(uid, userObject, reference, function(error, data) {
                            if (error) return res.status(200).json({
                                "status": 200,
                                "success": false,
                                "data": null,
                                "error_message": error.message
                            });
                            res.status(200).json({
                                "status": 200,
                                "success": true,
                                "data": data,
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
                    } 
                    else { 
                        data.user[0].token = customToken;
                        res.status(200).json({
                            "status": 200,
                            "success": true,
                            "data": data,
                            "error_message": null
                        });
                    }
                })
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

        getFirebaseAuthInstance(res, function(auth) { 
            auth.signInWithEmailAndPassword(email, password).then(function(error) {
                let currentUser = auth.currentUser;
                jwt.sign({ 
                    uid: currentUser.uid 
                }, 
                jwtrefresh, 
                {
                    expiresIn: jwtrefreshLimit
                }, function(err, customToken) {
                    if (err) return res.status(200).json({
                        "status": 200,
                        "success": false,
                        "data": null,
                        "error_message": err.message
                    });
                    getFirebaseFirStorageInstance(res, function(reference) {
                        retrieveUserObject(currentUser.uid, reference, function(error, data) {
                            if (error) return res.status(200).json({
                                "status": 200,
                                "success": false,
                                "data": null,
                                "error_message": error.message
                            });

                            if (!data.user[0]) return res.status(200).json({
                                "status": 200,
                                "success": false,
                                "data": null,
                                "error_message": "User does not exist."
                            }); 
    
                            data.user[0].email_address = currentUser.email;
                            data.user[0].token = customToken;
                            
                            res.status(200).json({
                                "status": 200,
                                "success": true,
                                "data": data,
                                "error_message": null
                            });
                        });
                    });
                })
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

    if (action == 'session_check') {

        let token = req.body.token;
        let uid = req.body.uid;

        if (!token || !uid) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Something went wrong. Please login again."
        });

        jwt.verify(token, jwtrefresh, (err, decoded) => {
            if (err) {
              return res.status(200).json({
                "status": 200,
                "success": false,
                "data": null,
                "error": err.message,
              });
            } else {
                getFirebaseFirStorageInstance(res, function(reference) {
                    retrieveUserObject(decoded.uid, reference, function(error, data) {
                        if (error) return res.status(200).json({
                            "status": 200,
                            "success": false,
                            "data": null,
                            "error_message": error.message
                        });

                        jwt.sign({ 
                            uid: decoded.uid 
                        }, 
                        jwtrefresh, 
                        {
                            expiresIn: jwtrefreshLimit
                        }, function(err, customToken) {
                            if (err) return res.status(200).json({
                                "status": 200,
                                "success": false,
                                "data": null,
                                "error_message": err.message
                            });

                            data.user[0].token = customToken;
                            
                            res.status(200).json({
                                "status": 200,
                                "success": true,
                                "data": data,
                                "error_message": null
                            });

                        });
                        
                    });
                })
            }
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
            auth.sendPasswordResetEmail(email).then(function() {
                res.status(200).json({
                    "status": 200,
                    "success": true,
                    "data": {
                        "email_sent": true
                    },
                    "error_message": null
                });
            }).catch(function(error) {
                res.status(200).json({
                    "status": 200,
                    "success": true,
                    "data": null,
                    "error_message": error.message
                });
            });
        });
    }

    if (action == 'log_out') {
        let uid = req.body.uid;

        if (!uid) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Something went wrong. Please try again."
        });

        getFirebaseAuthInstance(res, function(auth) { 
            if (uid !== auth.currentUser.uid) return res.status(200).json({
                "status": 200,
                "success": false,
                "data": null,
                "error_message": "Something went wrong. Please try again."
            });

            auth.signOut().then(function() {
                res.status(200).json({
                    "status": 200,
                    "success": true,
                    "data": {
                        "userId": uid,
                        "logout": true
                    },
                    "error_message": null
                });
              }).catch(function(error) {
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

function retrieveUserObject(uid, ref, completionHandler) {
    // Get the original user data
    let refCollection = ref.collection('users');
    refCollection.doc(uid).get(getOptions).then(function(doc) {
        var users = new Array();

        var userDoc = doc.data();
        if (userDoc == undefined) {
            completionHandler(
                null, 
                {
                    "uid": uid,
                    "user": new Array()
                }
            );
        }
        else {
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
                        let prefCollection = ref.collection('user_preferences');
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
                    // callback(null, null);
                    var accountTypes = new Array();
                    let prefCollection = ref.collection('account_roles');
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
                }, 
                meetings: function(callback) {
                    // callback(null, null);
                    var accountTypes = new Array();
                    retrieveMeetings('meetings', userDoc.uid, moment().format(), moment().format(), ref, function(error, data) {
                        if (error) { 
                            console.log(error.message);
                            callback(error, accountTypes);
                        } else {
                            data.meetings.forEach(function(meeting) {
                                console.log("Meeting added")
                                accountTypes.push(meeting);
                            });
                            callback(null, accountTypes);
                        }
                    });
                }
            }, function(error, results) {
                console.log(results);
                console.log(error);

                if (error) return completionHandler(error, null);

                if (results.preferences) {
                    userDoc.preferences = results.preferences
                }

                if (results.account_type) {
                    userDoc.account_type = results.account_type
                }

                if (results.meetings) {
                    userDoc.meetings = results.meetings
                }

                users.push(userDoc);

                let data = {
                    "uid": uid,
                    "user": users
                }
                completionHandler(null, data);
            });
        }
    })
    .catch(function (error) {
        completionHandler(error, null);
    });  
}

function saveUserObject(uid, data, reference, completionHandler) {
    let refCollection = reference.collection('users');
    refCollection.doc(uid).set(data).then(function(docRef) {
        console.log("Document written with ID: ", docRef);
        completionHandler(null, { "uid": uid })
    })
    .catch(function (error) {
        completionHandler(error, null);
    });  
}


function retrieveMeetings(collection, uid, optionalStartDate, optionalEndDate, reference, completionHandler) {
    // Get the original user data
    // Get the additional information for user
    console.log("The day before: " + optionalStartDate);
    console.log("The Day After: " + optionalEndDate);
    let refCollection = reference.collection(collection);
    refCollection.where('owner_id','==', uid).where("meeting_date.start_date", ">", optionalStartDate).where("meeting_date.start_date", "<=", optionalEndDate).get(getOptions).then(function(querySnapshot) {
        var users = new Array();

        async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
            var userDoc = doc.data();
            userDoc.key = doc.id;

            // Get the additional information for user
            async.parallel({
                owner: function(callback) {
                    var owner = new Array();
                    let prefCollection = reference.collection('users');
                    prefCollection.where('uid','==', userDoc.owner_id).get(getOptions).then(function(querysnapshot) {
                        async.forEachOf(querysnapshot.docs, function(d, k, c) {
                            var prefdata = d.data();
                            prefdata.key = d.id;
                            owner.push(prefdata);
                            c();
                        }, function(_e) {
                            if (_e) { 
                                console.log(_e.message);
                                callback(_e, owner);
                            } else {
                                callback(null, owner);
                            }
                        });
                    }).catch(function (error) {
                        if (error) {
                            console.log(error.message);
                            callback(error, null);
                        }
                    });
                },
                participants: function(callback) {
                    var participants = new Array();
                    let prefCollection = reference.collection('users');
                    async.forEachOf(userDoc.meeting_participants_ids, function(participantId, k, completion) {
                        prefCollection.where('uid','==', participantId).get(getOptions).then(function(querysnapshot) {
                            async.forEachOf(querysnapshot.docs, function(d, l, c) {
                                var prefdata = d.data();
                                prefdata.key = d.id;
                                participants.push(prefdata);
                                c();
                            }, function(_e) {
                                if (_e) { 
                                    console.log(_e.message);
                                    completion(_e, participants);
                                } else {
                                    completion(null, participants);
                                }
                            });
                        }).catch(function (error) {
                            if (error) {
                                console.log(error.message);
                                callback(error, null);
                            }
                        });
                    }, function(_e) {
                        if (_e) { 
                            console.log(_e.message);
                            callback(_e, participants);
                        } else {
                            callback(null, participants);
                        }
                    })
                },
                declined_participants: function(callback) {
                    var participants = new Array();
                    let prefCollection = reference.collection('users');
                    async.forEachOf(userDoc.decline_meeting_participants_ids, function(participantId, k, completion) {
                        prefCollection.where('uid','==', participantId).get(getOptions).then(function(querysnapshot) {
                            async.forEachOf(querysnapshot.docs, function(d, l, c) {
                                var prefdata = d.data();
                                prefdata.key = d.id;
                                participants.push(prefdata);
                                c();
                            }, function(_e) {
                                if (_e) { 
                                    console.log(_e.message);
                                    completion(_e, participants);
                                } else {
                                    completion(null, participants);
                                }
                            });
                        }).catch(function (error) {
                            if (error) {
                                console.log(error.message);
                                callback(error, null);
                            }
                        });
                    }, function(_e) {
                        if (_e) { 
                            console.log(_e.message);
                            callback(_e, participants);
                        } else {
                            callback(null, participants);
                        }
                    })
                },
                activity: function(callback) {
                    callback();
                }
            }, function(error, results) {
                console.log(results);
                console.log(error);

                if (error) return completionHandler(error, null);

                if (results.owner) {
                    userDoc.owner = results.owner;
                }

                if (results.participants) {
                    userDoc.participants = results.participants;
                }

                if (results.declined_participants) {
                    userDoc.declined_participants = results.declined_participants;
                }

                users.push(userDoc);
                completion();
            });
        }, function (err) {
            if (err) return completionHandler(err, null);
            let data = {
                "meetings": users.length > 0 ? users.sort((a, b) => b.meeting_date.end_date_timestamp - a.meeting_date.end_date_timestamp).reverse() : users
            }
            completionHandler(err, data);
        });
    }).catch(function (error) {
        completionHandler(error, null);
    });  
}

module.exports = router;