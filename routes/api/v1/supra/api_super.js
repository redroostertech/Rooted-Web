const express                           = require("express");
const path                              = require("path");
const router                            = express.Router();
const main                              = require("../../../../app");
const configs                           = require("../../../../configs");
const bodyParser                        = require("body-parser");
const session                           = require("client-sessions");
const formidable                        = require("formidable");
const async                             = require("async");
const mime                              = require("mime");
const randomstring                      = require("randomstring");

router.use(bodyParser.json({ limit: "500mb" }));
router.use(bodyParser.urlencoded({ limit: "500mb", extended: true, parameterLimit: 50000 }));
router.use(express.static(configs.basePublicPath, { maxage: configs.oneDay * 21 }));
router.use(session(configs.appSession));

router.post("/beowulf", function(req, res) { 
    // console.log(req.body);
    let action = req.body.action;
    if (action == "insert_into_collection") {
        getFirebaseFirStorageInstance(res, function(reference) {
            let refCollection = reference.collection(req.body.collection);

            var arrayOfErrors = new Array();
            var arrayOfDocumentIds = new Array();
            var operationsCompleted = 0;
            let data = JSON.parse(req.body.data);
            console.log(data);
            console.log(data.length);
  
            function completion() {
                ++operationsCompleted;
                if (operationsCompleted === data.length) return res.status(200).json({
                    "status": 200,
                    "success": true,
                    "data": {
                        "errors": arrayOfErrors,
                        "documentIds": arrayOfDocumentIds
                    },
                    "error_message": null 
                });
            }

            for (var i = 0; i < data.length; i++) {
                // console.log(data[i]);
                refCollection.add(data[i]).then(function(docRef) {
                    console.log("Document written with ID: ", docRef.id);
                    arrayOfDocumentIds.push(docRef.id);
                    completion();
                }).catch(function (error) {
                    arrayOfErrors.push(error.message);
                    completion();
                });
            }
            
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

let preference_push_notification = [{ "id": 0, "key": "preferences_push_notifications", "meta_information": null, "priority": 0, "minimum_user_type_required": 10, "title": "Notification", "description": "Enable push notifications", "type": "boolean", "default_is_on": "false", "is_active": true, "is_mobile": true, "is_extension": false, "choices": [ true, false ]
}, {
    "id": 1,
    "key": "preferences_location",
    "meta_information": null,
    "priority": 1,
    "minimum_user_type_required": 10,
    "title": "Location",
    "description": "Allow access to your location?",
    "type": "boolean",
    "default_is_on": "false",
    "is_active": true,
    "is_mobile": true,
    "is_extension": true,
    "choices": [ true, false ]
}, {
    "id": 2,
    "key": "preferences_start_week",
    "meta_information": null,
    "priority": 2,
    "minimum_user_type_required": 10,
    "title": "Start of the Week",
    "description": "Allow access to your location?",
    "type": "picker",
    "default_value": "0",
    "is_active": true,
    "is_mobile": true,
    "is_extension": true,
    "choices": { 
        "collection_name": "days_of_week",
        "values": [
            {
                "id": 0,
                "minimum_user_type_required": 10,
                "order": 0,
                "sh_title": "Sun",
                "title": "Sunday",
                "value": "Sunday"
            },{
                "id": 1,
                "minimum_user_type_required": 10,
                "order": 1,
                "sh_title": "Mon",
                "title": "Monday",
                "value": "Monday"
            },{
                "id": 2,
                "minimum_user_type_required": 10,
                "order": 2,
                "sh_title": "Tues",
                "title": "Tuesday",
                "value": "Tuesday"
            },{
                "id": 3,
                "minimum_user_type_required": 10,
                "order": 3,
                "sh_title": "Wed",
                "title": "Wednesday",
                "value": "Wednesday"
            },{
                "id": 4,
                "minimum_user_type_required": 10,
                "order": 4,
                "sh_title": "Thur",
                "title": "Thursday",
                "value": "Thursday"
            },{
                "id": 5,
                "minimum_user_type_required": 10,
                "order": 5,
                "sh_title": "Fri",
                "title": "Friday",
                "value": "Friday"
            },{
                "id": 6,
                "minimum_user_type_required": 10,
                "order": 6,
                "sh_title": "Sat",
                "title": "Saturday",
                "value": "Saturday"
            }
        ]
    }
}, {
    "id": 3,
    "key": "preferences_default_reminder",
    "meta_information": null,
    "priority": 3,
    "minimum_user_type_required": 10,
    "title": "Default Reminder Notifications",
    "description": "Enable reminder notifications",
    "type": "picker",
    "default_value": "0",
    "is_active": true,
    "is_mobile": true,
    "is_extension": true,
    "choices": { 
        "collection_name": "reminder_times",
        "values": [
            {
                "id": 0,
                "minimum_user_type_required": 10,
                "order": 0,
                "title": "10 minutes before",
                "sh_title": "10 minutes before",
                "value": "600000"
            },{
                "id": 1,
                "minimum_user_type_required": 10,
                "order": 1,
                "title": "25 minutes before",
                "sh_title": "25 minutes before",
                "value": "1500000"
            },{
                "id": 2,
                "minimum_user_type_required": 10,
                "order": 2,
                "title": "30 minutes before",
                "sh_title": "30 minutes before",
                "value": "1800000"
            },{
                "id": 3,
                "minimum_user_type_required": 10,
                "order": 3,
                "title": "1 hour before",
                "sh_title": "1 hour before",
                "value": "3600000"
            },{
                "id": 4,
                "minimum_user_type_required": 10,
                "order": 4,
                "title": "1 day before",
                "sh_title": "1 day before",
                "value": "86400000"
            },{
                "id": 5,
                "minimum_user_type_required": 10,
                "order": 5,
                "title": "1 week before",
                "sh_title": "1 week before",
                "value": "604800000"
            }
        ]
    }
}
]