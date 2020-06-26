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
        console.log('Request Body Data\n');
        console.log(data);

        if (!data.meeting_date.start_date || !data.meeting_date.end_date || !data.meeting_name || !data.owner_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        var agendaItems = data.agenda_items;

        console.log('\n\nAgenda Items\n');
        if (agendaItems && agendaItems.length > 0) {

            var agendaItemObject = agendaItems[0];
            
            var agendaItemOrder = agendaItemObject.order;
            var agendaItemName = agendaItemObject.item_name;

            if (agendaItemOrder.length > 0 && agendaItemName.length > 0) {
                var i = 0;
                var newAgendaItems = new Array();

                while (i < agendaItemOrder.length) {
                    var item = {
                        item_name: agendaItemName[i],
                        order: agendaItemOrder[i]
                    }
                    newAgendaItems.push(item);
                    i++;
                }

                console.log('\n\nNew Agenda Items\n');
                console.log(newAgendaItems);
                
                data.agenda_items = newAgendaItems;
            }
        }
        
        data.meeting_participants_ids = [data.owner_id];
        data.createdAt = new Date();

        console.log('\n\nFinished Data\n');
        console.log(data);

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

    if (action == 'retrieve_meeting_for_id') {
        if (!req.body.meetingId) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Something went wrong. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveMeetingsById(req.body.meetingId, reference, function(error, data) {
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
            updateMeetingForId(req.body.user_id, req.body.meeting_id, reference, function(error, data) {
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

    if (action == 'decline_meeting') {
        if (!req.body.meeting_id || !req.body.user_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            removeParticipantForMeeting(req.body.user_id, req.body.meeting_id, reference, function(error, data) {
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

    if (action == 'create_workspace') { 

    }

    if (action == 'send_activity') {
        let data = req.body.data;

        if (!data.sender_id || !data.object_id || !data.activity_type) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        switch (data.activity_type) {
            case 0:
                data.collection = 'meetings'
                data.description = 'Meeting participant accepted meeting'
            case 1:
                data.collection = 'meetings'
                data.description = 'Meeting participant declined meeting'
            case 1:
                data.collection = 'meetings'
                data.description = 'Meeting participant is tentative'
        }

        data.createdAt = new Date();
        
        getFirebaseFirStorageInstance(res, function(reference) {
            let refCollection = reference.collection('activity');
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

    if (action == 'get_activity_for_object') {
        let data = req.body.data;

        if (!data.object_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveActivityForId(req.body.object_id, reference, function(error, data) {
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

    // MARK: - ZOOM
    if (action == 'createMeeting') {
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

    if (action == 'createUser') {
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

    // MARK: - MailJet
}); 

function createMeeting(data, callback) {
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
        newAgendaItems.push(item);
    });
    
    data.agenda_items = newAgendaItems;
    data.meeting_participants_ids = [data.owner_id];

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
                    }, function(error, results) {
                        console.log(results);
                        console.log(error);

                        if (error) return callback(error, null);

                        if (results.owner) {
                            userDoc.owner = results.owner
                        }

                        if (results.participants) {
                            userDoc.participants = results.participants;
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
                    }, function(error, results) {
                        console.log(results);
                        console.log(error);

                        if (error) return callback(error, null);

                        if (results.owner) {
                            userDoc.owner = results.owner
                        }

                        if (results.participants) {
                            userDoc.participants = results.participants;
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

        var meetingIds = new Array();
        var meetings = new Array();

        if (results.my_meetings) {
            results.my_meetings.forEach(function(meeting) {
                if (!meetingIds.includes(meeting.id)) {
                    meetings.push(meeting);
                    meetingIds.push(meeting.id);
                }
            });
        }

        if (results.other_meetings) {
            results.other_meetings.forEach(function(meeting) {
                if (!meetingIds.includes(meeting.id)) {
                    meetings.push(meeting);
                    meetingIds.push(meeting.id);
                }
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

            // console.log(moment(userDoc.meeting_date.end_date).diff(moment(), 'days'));
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
            }, function(error, results) {
                console.log(results);
                console.log(error);

                if (error) return completionHandler(error, null);

                if (results.owner) {
                    userDoc.owner = results.owner
                }

                if (results.participants) {
                    userDoc.participants = results.participants;
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
            var meetingParticipantsId = doc.data().meeting_participants_ids;

            if (meetingParticipantsId.includes(data)) {
                return completion();
            } 

            meetingParticipantsId.push(data);
            let object = {
                'meeting_participants_ids': meetingParticipantsId
            }
            refCollection.doc(doc.id).set(object, { merge: true }).then(function() {
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

function removeParticipantForMeeting(data, id, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection('meetings');
    refCollection.where('id', '==', id).get(getOptions).then(function(querySnapshot) {
        async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
            var meetingParticipantsId = doc.data().meeting_participants_ids.filter(function(participantId) {
                return participantId !== data
            });
            let object = {
                'meeting_participants_ids': meetingParticipantsId
            }
            refCollection.doc(doc.id).set(object, { merge: true }).then(function() {
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

function retrieveActivityForId(id, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection('activity');
    refCollection.where('object_id', '==', id).get(getOptions).then(function(querySnapshot) {
        var users = new Array();

        async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
            var userDoc = doc.data();
            userDoc.key = doc.id;

            // Get the additional information for user
            async.parallel({
                owner: function(callback) {
                    var owner = new Array();
                    let prefCollection = reference.collection('users');
                    prefCollection.where('uid','==', userDoc.sender_id).get(getOptions).then(function(querysnapshot) {
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
                "activity": users
            }
            completionHandler(err, data);
        });
    }).catch(function (error) {
        completionHandler(error, null);
    });  
}

module.exports = router;