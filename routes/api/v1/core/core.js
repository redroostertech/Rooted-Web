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
const jwt                               = require('jsonwebtoken');
const rp                                = require('request-promise');
const moment                            = require('moment');
const async                             = require('async');

var Zoom = require('zoomus')({
    key: 'z8O78FV9TtG8H9lIxqwR6w',
    secret: 'jtNg8JEVVPJKCUy40U8qRUktJ37fuzwBglQF'
   });

   //Use the ApiKey and APISecret from config.js
const payload = {
    iss: 'z8O78FV9TtG8H9lIxqwR6w',
    exp: ((new Date()).getTime() + 5000)
};
const token = jwt.sign(payload, 'jtNg8JEVVPJKCUy40U8qRUktJ37fuzwBglQF');

var getOptions = { source: 'cache' };

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

            if (!req.body.uid) return res.status(200).json({
                "status": 200,
                "success": false,
                "data": null,
                "error_message": "Something went wrong. Please try again."
            });

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

    if (action == 'save_meeting') {
        let data = req.body.data;
        console.log(data);

        if (!data.meeting_date.start_date || !data.meeting_date.end_date || !data.meeting_name || !data.owner_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        let startDate = data.meeting_date.start_date;
        data.meeting_date.start_date = moment(startDate).unix();

        let endDate = data.meeting_date.end_date;
        data.meeting_date.end_date = moment(endDate).unix();

        // let meetingObject = {
        //     dashboard_section_id: data.dashboard_section_id,
        //     id: data.id,
        //     end_date: data.meeting_date.end_date,
        //     start_date: data.meeting_date.start_date,
        //     time_zone: data.time_zone,
        //     meeting_description: data.meeting_description,
        //     meeting_name: data.meeting_name,
        //     meeting_type: data.meeting_type,
        //     owner_id: data.owner_id,
        //     createdAt: moment().unix(),
        // }
        
        getFirebaseFirStorageInstance(res, function(reference) {
            let refCollection = reference.collection('meetings');
            refCollection.add(data).then(function(docRef) {
                console.log("Document written with ID: ", docRef.id);
                data.key = docRef.id;
                res.status(200).json({
                    "status": 200,
                    "success": true,
                    "data": data,
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
    }

    if (action == 'retrieve_meetings_for_user') {
        if (!req.body.uid) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Something went wrong. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveMeetings(req.body.uid, reference, function(error, data) {
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
        });
    }

    if (action =='createMeeting') {
        email = req.body.email;
        var options = {
            method: "POST",
            uri: "https://api.zoom.us/v2/users/" + email + "/meetings",
            body: {
                topic: "test create meeting",
                type: 1,
                settings: {
                    host_video: "true",
                    participant_video: "true"
                }
            },
            auth: {
                bearer: token
            },
            headers: {
                "User-Agent": "Zoom-api-Jwt-Request",
                "content-type": "application/json"
            },
            json: true //Parse the JSON string in the response
        };

        rp(options).then(function(response) {
            console.log("response is: ", response);
            res.send("create meeting result: " + JSON.stringify(response));
        }).catch(function(err) {
            // API call failed...
            console.log("API call failed, reason ", err);
        });
    }

    if (action =='createUser') {
        email = req.body.email;
        var options = {
            method: "POST",
            uri: "https://api.zoom.us/v2/users",
            body: {
                "action": "create",
                "user_info": {
                    "email": email,
                    "type": 1,
                    "first_name": "Terry",
                    "last_name": "Jones"
                }
            },
            auth: {
                bearer: token
            },
            headers: {
                "User-Agent": "Zoom-api-Jwt-Request",
                "content-type": "application/json"
            },
            json: true //Parse the JSON string in the response
        };

        rp(options).then(function(response) {
            console.log("response is: ", response);
            res.send("create meeting result: " + JSON.stringify(response));
        }).catch(function(err) {
            // API call failed...
            console.log("API call failed, reason ", err);
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

function retrieveMeetings(uid, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection('meetings');
    refCollection.where('owner_id','==', uid).get(getOptions).then(function(querySnapshot) {
        var users = new Array();

        async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
            var userDoc = doc.data();

            if (userDoc.meeting_date.end_date < moment(startDate).unix()) return completion();

            userDoc.key = doc.id;
            
            userDoc.meeting_date = {
                end_date: userDoc.meeting_end_date,
                start_date: userDoc.meeting_end_date
            }

            // Get the additional information for user
            //  Preferences
            //  Account Type
            //  Card on File
            async.parallel({
                owner: function(callback) {
                    var owner = new Array();
                    let prefCollection = reference.collection('users');
                    prefCollection.where('id','==', userDoc.owner_id).get(getOptions).then(function(querysnapshot) {
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
                }
            }, function(error, results) {
                console.log(results);
                console.log(error);

                if (error) return completionHandler(error, null);

                if (results.owner) {
                    userDoc.owner = results.owner
                }

                users.push(userDoc);
                completion();
            });
        }, function (err) {
            if (err) return completionHandler(err, null);
            let data = {
                "meetings": users
            }
            completionHandler(err, data);
        });
    }).catch(function (error) {
        completionHandler(error, null);
    });  
}

module.exports = router;