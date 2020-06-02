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

        var agendaItems = data.agenda_items;
        var newAgendaItems = new Array();
        agendaItems.forEach(function(agendaItem) {
            var item = {
                item_name: agendaItem.item_name,
                order: agendaItem.order
            }
        });
        
        data.agendaItems = newAgendaItems;
        
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

    if (action == 'retrieve_upcoming_meetings_for_user') {
        if (!req.body.uid) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Something went wrong. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveUpcomingMeetings(req.body.uid, reference, function(error, data) {
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

    if (action == 'accept_meeting') {
        if (!req.body.meeting_id || !req.body.user_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            let data = {
                'meeting_participants_ids': user_id
            }
            updateMeetingForId(data, req.body.meeting_id, reference, function(error, data) {
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

    if (action == 'delete_meeting') {
        if (!req.body.meeting_id || !req.body.owner_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveMeetingsById(req.body.meeting_id, reference, function(error, data) {
                if (error) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": error.message
                });

                var meeting = data.meetings[0];

                if (!meeting) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": "A meeting was not found for provided id. Please try again."
                });

                if (meeting.owner_id !== req.body.owner_id) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": "You do not have the permission to delete this meeting."
                });

                reference.collection('meetings').doc(meeting.key).delete().then(function() {
                    res.status(200).json({
                        "status": 200,
                        "success": true,
                        "data": {
                            "message": "Meeting was deleted.",
                            "deleted_message": data
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

function retrieveUpcomingMeetings(uid, reference, completionHandler) {
    // Get the original user data
    // Get the additional information for user
    async.parallel({
        other_meetings: function(callback) {
            let refCollection = reference.collection('meetings');
            refCollection.where('meeting_participants_ids','array-contains', uid).get(getOptions).then(function(querySnapshot) {
                var users = new Array();

                async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
                    var userDoc = doc.data();

                    console.log(moment(userDoc.meeting_date.end_date).diff(moment(), 'days'));
                    if (moment(userDoc.meeting_date.end_date).diff(moment(), 'days') < -1) return completion();

                    userDoc.key = doc.id;

                    // Get the additional information for user
                    async.parallel({
                        owner: function(cback) {
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
                                        cback(_e, owner);
                                    } else {
                                        cback(null, owner);
                                    }
                                });
                            }).catch(function (error) {
                                if (error) {
                                    console.log(error.message);
                                    cback(error, null);
                                }
                            });
                        }
                    }, function(error, results) {
                        console.log(results);
                        console.log(error);

                        if (error) return callback(error, null);

                        if (results.owner) {
                            userDoc.owner = results.owner
                        }

                        users.push(userDoc);
                        completion();
                    });
                }, function (err) {
                    if (err) return callback(err, null);
                    callback(err, users);
                });
            }).catch(function (error) {
                callback(error, null);
            });  
        },

        my_meetings: function(callback) {
            let refCollection = reference.collection('meetings');
            refCollection.where('owner_id','==', uid).get(getOptions).then(function(querySnapshot) {
                var users = new Array();

                async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
                    var userDoc = doc.data();

                    console.log(moment(userDoc.meeting_date.end_date).diff(moment(), 'days'));
                    if (moment(userDoc.meeting_date.end_date).diff(moment(), 'days') < -1) return completion();

                    userDoc.key = doc.id;

                    // Get the additional information for user
                    async.parallel({
                        owner: function(cback) {
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
                                        cback(_e, owner);
                                    } else {
                                        cback(null, owner);
                                    }
                                });
                            }).catch(function (error) {
                                if (error) {
                                    console.log(error.message);
                                    cback(error, null);
                                }
                            });
                        }
                    }, function(error, results) {
                        console.log(results);
                        console.log(error);

                        if (error) return callback(error, null);

                        if (results.owner) {
                            userDoc.owner = results.owner
                        }

                        users.push(userDoc);
                        completion();
                    });
                }, function (err) {
                    if (err) return callback(err, null);
                    callback(err, users);
                });
            }).catch(function (error) {
                callback(error, null);
            });  
        }
    }, function(err, results) {
        if (err) return completionHandler(err, null);

        var meetings = new Array();

        if (results.my_meetings) {
            results.my_meetings.forEach(function(meeting) {
                meetings.push(meeting);
            });
        }

        if (results.other_meetings) {
            results.other_meetings.forEach(function(meeting) {
                meetings.push(meeting);
            });
        }

        let data = {
            "meetings": meetings
        }

        completionHandler(err, data);
    });
}

function retrieveMeetings(uid, reference, completionHandler) {
    // Get the original user data
    // Get the additional information for user
    let refCollection = reference.collection('meetings');
    refCollection.where('owner_id','==', uid).get(getOptions).then(function(querySnapshot) {
        var users = new Array();

        async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
            var userDoc = doc.data();

            console.log(moment(userDoc.meeting_date.end_date).diff(moment(), 'days'));
            if (moment(userDoc.meeting_date.end_date).diff(moment(), 'days') < -1) return completion();

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

function retrieveMeetingsById(id, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection('meetings');
    refCollection.where('id', '==', id).get(getOptions).then(function(querySnapshot) {
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

function updateMeetingForId(data, id, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection('meetings');
    refCollection.where('id', '==', id).get(getOptions).then(function(querySnapshot) {
        async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
            refCollection.doc(doc.id).set(data, { merge: true }).then(function() {
                completion();
            }).catch(function (error) {
                completionHandler(error, null);
            });
        }, function (err) {
            if (err) return completionHandler(err, null);
            retrieveMeetingsById(id, reference, completionHandler);
        });
    }).catch(function (error) {
        completionHandler(error, null);
    });  
}

module.exports = router;