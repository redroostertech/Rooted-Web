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

    if (action == 'save_meeting') {
        // start_date
        // end_date
        // time_zone
        // meeting_location
        // meeting_type
        // meeting_description
        // agenda_items
        // meeting_name
        let data = req.body.data;
        console.log(data);

        if (!data.meeting_date.start_date || !data.meeting_date.end_date || !data.meeting_name || !data.owner) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

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

module.exports = router;