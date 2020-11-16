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

const twilio                            = require('twilio');
const mailJet                           = require('node-mailjet').connect('b3711ac51c20213f29f627828b864471', '4b1b0d115a79c620e323ab576e80df26');

var twilioClient = new twilio(configs.twilioAccountSid, configs.twilioAccountAuthToken);

var Zoom = require('zoomus')({
    key: configs.zoomKey,
    secret: configs.zoomSecret
   });

   //Use the ApiKey and APISecret from config.js
const payload = {
    iss: 'z8O78FV9TtG8H9lIxqwR6w',
    exp: ((new Date()).getTime() + 5000)
};
const token = jwt.sign(payload, 'jtNg8JEVVPJKCUy40U8qRUktJ37fuzwBglQF');

var getOptions = { source: 'cache' };

var activeFunctions = [
    'update_user',
    'retrieve_user_for_id',
    'save_meeting',
    'retrieve_upcoming_meetings_for_user',
    'retrieve_sent_meetings_for_user', 
    'retrieve_meeting_for_id', 'accept_meeting', 
    'decline_meeting',
    'update_meeting', 
    'cancel_meeting',
    'delete_meeting',
    'create_workspace', 
    'send_activity', 
    'get_activity_for_object', 
    'retrieve_meeting_drafts_for_user',
    'save_draft', 
    'update_draft', 
    'delete_draft'
]

router.use(bodyParser.json({ limit: '500mb' }));
router.use(bodyParser.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));
router.use(express.static(configs.basePublicPath, { maxage: configs.oneDay * 21 }));
router.use(session(configs.appSession));

router.post('/eggman', function(req, res) { 
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

    if (action == 'update_user') {
        getFirebaseFirStorageInstance(res, function(reference) {
            let refCollection = reference.collection('users');
            var data;
            if (typeof req.body.data === 'string') {
                console.log('Data is a string');
                data = JSON.parse(req.body.data);
            } else {
                data = req.body.data;
            }

            // console.log(data);

            if (!req.body.key || !req.body.uid) return res.status(200).json({
                "status": 200,
                "success": false,
                "data": null,
                "error_message": "Something went wrong. Please try again."
            });

            refCollection.doc(req.body.key).set(data, { merge: true }).then(function() {
                retrieveUserObject(req.body.uid, reference, function(error, data) {
                    if (error) return res.status(200).json({
                        "status": 200,
                        "success": false,
                        "data": null,
                        "error_message": error.message
                    });
    
                    if (data.user.length === 0) return res.status(200).json({
                        "status": 200,
                        "success": false,
                        "data": null,
                        "error_message": "User does not exist."
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
    }

    if (action == 'retrieve_user_for_id') {
        if (!req.body.uid) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Something went wrong. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveUserObject(req.body.uid, reference, function(error, data) {
                if (error) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": error.message
                });

                if (data.user.length === 0) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": "User does not exist."
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

    if (action == 'save_meeting') {
        // let data = JSON.parse(JSON.parse(req.body.data));
        let data = JSON.parse(req.body.data);
        console.log('Request Body Data');
        console.log(data);

        console.log(data.owner_id);
        if (!data.meeting_date.start_date || !data.meeting_date.end_date || !data.meeting_name || !data.owner_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });
        
        data.meeting_participants_ids = [data.owner_id];
        data.createdAt = new Date();

        console.log('\n\nFinished Data\n');
        console.log(data);

        // Get the additional information for user
        getFirebaseFirStorageInstance(res, function(reference) {
            async.parallel({
                save: function(callback) {
                    let refCollection = reference.collection('meetings');
                    refCollection.add(data).then(function(docRef) {
                        console.log("Document written with ID: ", docRef.id);
                        data.key = docRef.id;
                        callback(null, data);
                    }).catch(function (error) {
                        if (error) {
                            console.log("Save error");
                            console.log(error);
                            return callback(error, null); 
                        } 
                        return
                    });
                },
                delete_draft: function(callback) {
                    retrieveDraftMeetingById('draft_meetings', data.id, reference, function(error, result) {

                        var meeting = result.meetings[0];
                        var deleteDraftResult = new Object;
        
                        deleteDraftResult.didDeleteDraft = false;
                        deleteDraftResult.reason = "A meeting draft does not exist for this invite.";
                        if (!meeting) return callback(null, deleteDraftResult);
        
                        deleteDraftResult.didDeleteDraft = false;
                        deleteDraftResult.reason = "You do not have the permission to delete this meeting draft.";
                        if (meeting.owner_id !== data.owner_id) return callback(null, deleteDraftResult);
        
                        reference.collection('draft_meetings').doc(meeting.key).delete().then(function() {
                            deleteDraftResult.didDeleteDraft = true;
                            deleteDraftResult.reason =  "Draft deleted"
                            callback(null, deleteDraftResult);
                        }).catch(function(err) {
                            console.log(err);
                            deleteDraftResult.didDeleteDraft = false;
                            deleteDraftResult.reason =  err.message;
                            callback(null, deleteDraftResult);
                        });
                    });
                },
            }, function(error, results) {
                if (error) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": error.message
                });

                res.status(200).json({
                    "status": 200,
                    "success": true,
                    "data": {
                        "meeting": [results.save],
                        "draftDeleted": results.delete_draft
                    },
                    "error_message": null
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

        var startDate; 
        if (!req.body.date) {
            startDate = moment().subtract(1, 'days').format();
        } else {
            startDate = moment(req.body.date).subtract(0, 'days').format();
        }

        var endDate;
        if (!req.body.endDate) {
            endDate = moment().add(1, 'days').format();
        } else {
            endDate = moment(req.body.endDate).add(0, 'days').format();
        }

        console.log(`
        Start date: ${startDate}\n
        End date: ${endDate}\n
        `);

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveUpcomingMeetings('meetings', req.body.uid, startDate, endDate, reference, function(error, data) {
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

    if (action == 'retrieve_sent_meetings_for_user') {
        if (!req.body.uid) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Something went wrong. Please try again."
        });

        var startDate = moment().subtract(7, 'days').format();
        var endDate = moment().add(1, 'days').format();

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveMeetings('meetings', req.body.uid, startDate, endDate, reference, function(error, data) {
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
            retrieveMeetingsById('meetings', req.body.meetingId, reference, function(error, data) {
                if (error) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": error.message
                });

                if (data.meetings.length === 0) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": "Meeting does not exist."
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
            updateMeetingForId('meetings', req.body.user_id, req.body.meeting_id, reference, function(error, data) {
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
            removeParticipantForMeeting('meetings', req.body.user_id, req.body.meeting_id, reference, function(error, data) {
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

    if (action == 'update_meeting') {
        if (!req.body.meeting_id || !req.body.user_id || !req.body.data) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveMeetingsById('meetings', req.body.meeting_id, reference, function(error, data) {
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

                if (meeting.user_id !== req.body.owner_id) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": "You do not have the permission to delete this meeting."
                });

                let updateData = JSON.parse(req.body.data);
                console.log("Update data");
                console.log(updateData);
                Object.keys(updateData).forEach(function(key) {
                    meeting[key] = updateData[key];
                });
                reference.collection('meetings').doc(meeting.key).set(meeting, { merge: true }).then(function() {
                    res.status(200).json({
                        "status": 200,
                        "success": true,
                        "data": {
                            "meeting_id": req.body.meeting_id
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

    if (action == 'cancel_meeting') {
        if (!req.body.meeting_id || !req.body.user_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveMeetingsById('meetings', req.body.meeting_id, reference, function(error, data) {
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

                if (meeting.user_id !== req.body.owner_id) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": "You do not have the permission to delete this meeting."
                });

                meeting['meeting_status_id'] = 1;
                reference.collection('meetings').doc(meeting.key).set(meeting, { merge: true }).then(function() {

                    meeting.participants.forEach(function(participant) {
                        var user = [{
                            "Email": participant.email_address,
                            "Name": participant.full_name,
                        }]
                        var title = "CANCELLED ROOTED MEETING: " + meeting.meeting_name + " On July 23,2020 @ 10:30 AM"
                        var html = "<!DOCTYPE html><html xmlns:v='urn:schemas-microsoft-com:vml' xmlns:o='urn:schemas-microsoft-com:office:office'><head><meta charset='utf8'><meta http-equiv='x-ua-compatible' content='ie=edge'><meta name='viewport' content='width=device-width, initial-scale=1'><meta name='x-apple-disable-message-reformatting'><title>CANCELLED ROOTED MEETING: " + meeting.meeting_name + " On July 23,2020 @ 10:30 AM</title><!--[if mso]> <xml> <o:OfficeDocumentSettings> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml><style>table{border-collapse:collapse}td,th,div,p,a,h1,h2,h3,h4,h5,h6{font-family:'Segoe UI',Arial,sans-serif;mso-line-height-rule:exactly}</style><![endif]--><style>.hover-bg-brand-600:hover{background-color:#0047c3 !important}.hover-text-brand-700:hover{color:#003ca5 !important}.hover-underline:hover{text-decoration:underline !important}@media screen{img{max-width:100%}.all-font-sans{font-family:-apple-system,'Segoe UI',sans-serif !important}}@media (max-width: 640px){u~div .wrapper{min-width:100vw}.sm-border-none{border-style:none !important}.sm-block{display:block !important}.sm-table{display:table !important}.sm-table-caption{display:table-caption !important}.sm-table-footer-group{display:table-footer-group !important}.sm-table-header-group{display:table-header-group !important}.sm-h-16{height:16px !important}.sm-h-40{height:40px !important}.sm-mx-auto{margin-left:auto !important;margin-right:auto !important}.sm-mb-8{margin-bottom:8px !important}.sm-mt-16{margin-top:16px !important}.sm-mb-16{margin-bottom:16px !important}.sm-mt-24{margin-top:24px !important}.sm-p-0{padding:0 !important}.sm-py-16{padding-top:16px !important;padding-bottom:16px !important}.sm-px-16{padding-left:16px !important;padding-right:16px !important}.sm-py-24{padding-top:24px !important;padding-bottom:24px !important}.sm-pl-0{padding-left:0 !important}.sm-pb-8{padding-bottom:8px !important}.sm-pr-20{padding-right:20px !important}.sm-pt-24{padding-top:24px !important}.sm-text-center{text-align:center !important}.sm-text-14{font-size:14px !important}.sm-w-full{width:100% !important}.sm-table-header-group{display:table-header-group !important}.sm-table-footer-group{display:table-footer-group !important}.sm-table-caption{display:table-caption !important}}</style></head><body lang='en' style='margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #ffffff;'><div style='display: none; line-height: 0; font-size: 0;'>CANCELLED ROOTED MEETING: " + meeting.meeting_name + " On July 23,2020 @ 10:30 AM&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj; &#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj; &#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;&zwnj;&#160;</div><table class='wrapper all-font-sans' style='width: 100%;' cellpadding='0' cellspacing='0' role='presentation'><tr><td align='center' style bgcolor='#ffffff'><table class='sm-w-full' style='width: 640px;' cellpadding='0' cellspacing='0' role='presentation'><tr><td class='sm-px-16 sm-py-24' style='padding-left: 40px; padding-right: 40px; padding-top: 48px; padding-bottom: 48px; text-align: center;' bgcolor='#ffffff' align='center'><div style='margin-bottom: 24px;'> <a href='http://theappcalledrooted.com' style='color: #0047c3; text-decoration: none;'> <img src='https://res.cloudinary.com/dxa66e5ic/image/upload/v1560246657/transactional-emails/logo.png' alt='craftingemails' width='143' style='line-height: 100%; vertical-align: middle; border: 0;'> </a></div><p style='line-height: 28px; margin: 0; color: #4a5566; font-size: 21px;'>Hi " + participant.full_name + " 👋</p><p style='line-height: 28px; margin: 0; color: #4a5566; font-size: 21px;'>Meeting organized by " + meeting.owner[0].full_name + " was cancelled.</p><p style='line-height: 28px; margin: 0; color: #4a5566; font-size: 21px;'>Please contact meeting organizer for more information.</p><div class='sm-h-16' style='line-height: 16px;'>&nbsp;</div><table align='center' class='sm-w-full' style='margin-left: auto; margin-right: auto;' cellpadding='0' cellspacing='0' role='presentation'><tr><td align='center' class='hover-bg-brand-600' style='mso-padding-alt: 20px 32px; border-radius: 4px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .1), 0 1px 2px 0 rgba(0, 0, 0, .06); color: #ffffff;' bgcolor='#f88500'> <a href='http://theappcalledrooted.com' class='sm-text-14 sm-py-16' style='display: inline-block; font-weight: 700; line-height: 16px; padding-top: 20px; padding-bottom: 20px; padding-left: 32px; padding-right: 32px; color: #ffffff; font-size: 16px; text-decoration: none;'>Contact Organizer</a></td></tr></table><table style='width: 100%;' cellpadding='0' cellspacing='0' role='presentation'><tr class='sm-w-full sm-table'><td class='sm-p-0 sm-text-center sm-table-footer-group sm-w-full' style='border-left: 1px solid #ededf2; padding-left: 16px; padding-top: 24px; padding-bottom: 32px; text-align: left; width: 289px;' align='left'><p class='sm-mb-16' style='font-weight: 700; line-height: 28px; margin: 0; margin-bottom: 12px; color: #4a5566; font-size: 21px;'>" + meeting.meeting_name + "</p><table class='sm-mx-auto' cellpadding='0' cellspacing='0' role='presentation'><tr><td class='sm-block sm-text-center' style='padding-right: 6px;'> <a href='http://craftingemails.com' class='hover-text-brand-700 hover-underline sm-block sm-mb-8' style='text-decoration: none; font-weight: 700; line-height: 16px; color: #0052e2; font-size: 12px;'>organized by " + meeting.owner[0].full_name + "</a></td></tr><tr><td class='sm-block sm-text-center' style='padding-top: 20px; padding-right: 6px; vertical-align: top; width: 92px;'><p style='line-height: 22px; margin: 0; color: #8492a6; font-size: 16px;'>" + meeting.meeting_description + "</p></td></tr></table></td><td align='right' class='sm-pb-8 sm-table-caption sm-w-full' style='padding-top: 24px; vertical-align: top; width: 118px;' valign='top'><table class='sm-mx-auto' cellpadding='0' cellspacing='0' role='presentation'><tr><td style='border-radius: 8px; line-height: 16px; padding-top: 2px; padding-bottom: 2px; padding-left: 8px; padding-right: 8px; color: white; font-size: 12px;' bgcolor='red'>Cancelled</td></tr></table></td></tr></table><div class='sm-h-40' style='line-height: 40px;'>&nbsp;</div><div style='text-align: left;'><table style='width: 100%;' cellpadding='0' cellspacing='0' role='presentation'><tr><td style='padding-bottom: 16px; padding-top: 64px;'><div style='background-color: #e1e1ea; height: 1px; line-height: 1px;'>&nbsp;</div></td></tr></table><p style='line-height: 16px; margin-top: 0; margin-bottom: 16px; color: #8492a6; font-size: 12px;'> This email was sent to you as a registered member of <a href='http://theappcalledrooted.com' class='hover-text-brand-700 hover-underline' style='color: #f88500; text-decoration: none; display: inline-block;'>Rooted</a>. To update your emails preferences <a href='http://theappcalledrooted.com' class='hover-text-brand-700 hover-underline' style='color: #f88500; text-decoration: none; display: inline-block;'>click here</a>. <span class='sm-block sm-mt-16'>Use of the service and website is subject to our <a href='http://craftingemails.com' class='hover-text-brand-700 hover-underline' style='color: #f88500; text-decoration: none; display: inline-block;'>Terms of Use</a> and <a href='http://theappcalledrooted.com' class='hover-text-brand-700 hover-underline' style='color: #f88500; text-decoration: none; display: inline-block;'>Privacy Statement</a>.</span></p><p style='line-height: 16px; margin: 0; color: #8492a6; font-size: 12px;'>&copy; 2020 RedRooster Technologies. All rights reserved.</p></div></td></tr></table></td></tr></table></body></htm"
                        sendEmail(user, title, '', html, 'CancelledMeeting');    
                    });


                    res.status(200).json({
                        "status": 200,
                        "success": true,
                        "data": {
                            "meeting_id": req.body.meeting_id
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

    if (action == 'delete_meeting') {
        if (!req.body.meeting_id || !req.body.owner_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveMeetingsById('meetings', req.body.meeting_id, reference, function(error, data) {
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

    // Drafts
    if (action == 'retrieve_meeting_drafts_for_user') {
        if (!req.body.uid) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "Something went wrong. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveDraftMeetings('draft_meetings', req.body.uid, reference, function(error, data) {
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

    if (action == 'save_draft') {
        // let data = JSON.parse(JSON.parse(req.body.data));
        let data = JSON.parse(req.body.data);
        console.log('Request Body Data');
        console.log(data);

        console.log(data.owner_id);
        if (!data.owner_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        data.meeting_participants_ids = [data.owner_id];
        data.createdAt = new Date();

        console.log('\n\nFinished Data\n');
        console.log(data);

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveDraftMeetingById('draft_meetings', data.id, reference, function(error, result) {

                var meeting = result.meetings[0];
                if (!meeting) {
                    let refCollection = reference.collection('draft_meetings');
                    refCollection.add(data).then(function(docRef) {
                        console.log("Document written with ID: ", docRef.id);
                        data.key = docRef.id;
                        return res.status(200).json({
                            "status": 200,
                            "success": true,
                            "data": data,
                            "error_message": null
                        });
                    }).catch(function (error) {
                        // arrayOfErrors.push(error.message);
                        return res.status(200).json({
                            "status": 200,
                            "success": false,
                            "data": null,
                            "error_message": error.message
                        });
                    });
                }

                if (meeting.owner_id !== data.owner_id) {
                    let refCollection = reference.collection('draft_meetings');
                    refCollection.add(data).then(function(docRef) {
                        console.log("Document written with ID: ", docRef.id);
                        data.key = docRef.id;
                        return res.status(200).json({
                            "status": 200,
                            "success": true,
                            "data": data,
                            "error_message": null
                        });
                    }).catch(function (error) {
                        // arrayOfErrors.push(error.message);
                        return res.status(200).json({
                            "status": 200,
                            "success": false,
                            "data": null,
                            "error_message": error.message
                        });
                    });
                }

                reference.collection('draft_meetings').doc(meeting.key).set(data, { merge: true }).then(function() {
                    return res.status(200).json({
                        "status": 200,
                        "success": true,
                        "data": data,
                        "error_message": null 
                    });
                }).catch(function (error) {
                    return res.status(200).json({
                        "status": 200,
                        "success": false,
                        "data": null,
                        "error_message": error.message
                    });
                });
            });
        });
    }

    if (action == 'update_draft') {
        if (!req.body.meeting_id || !req.body.user_id || !req.body.data) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveMeetingsById('draft_meetings', req.body.meeting_id, reference, function(error, data) {
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

                if (meeting.user_id !== req.body.owner_id) return res.status(200).json({
                    "status": 200,
                    "success": false,
                    "data": null,
                    "error_message": "You do not have the permission to delete this meeting."
                });

                let updateData = JSON.parse(req.body.data);
                console.log("Update data");
                console.log(updateData);
                Object.keys(updateData).forEach(function(key) {
                    meeting[key] = updateData[key];
                });
                reference.collection('draft_meetings').doc(meeting.key).set(meeting, { merge: true }).then(function() {
                    res.status(200).json({
                        "status": 200,
                        "success": true,
                        "data": {
                            "meeting_id": req.body.meeting_id
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

    if (action == 'delete_draft') {
        if (!req.body.meeting_id || !req.body.owner_id) return res.status(200).json({
            "status": 200,
            "success": false,
            "data": null,
            "error_message": "1 or more parameters are missing. Please try again."
        });

        getFirebaseFirStorageInstance(res, function(reference) {
            retrieveMeetingsById('draft_meetings', req.body.meeting_id, reference, function(error, data) {
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

                reference.collection('draft_meetings').doc(meeting.key).delete().then(function() {
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

    // MARK: - ZOOM
    if (action == 'createMeeting') {
        email = req.body.email;
        var options = {
            method: "POST",
            uri: "" + email + "/meetings",
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

function retrieveUpcomingMeetings(collection, uid, optionalStartDate, optionalEndDate, reference, completionHandler) {
    
    // Get the original user data
    // Get the additional information for user
    console.log("The day before: " + optionalStartDate);
    console.log("The Day After: " + optionalEndDate);

    async.parallel({
        other_meetings: function(callback) {
            let refCollection = reference.collection(collection);
            refCollection.where('meeting_participants_ids','array-contains', uid).where("meeting_date.start_date", ">", optionalStartDate).where("meeting_date.start_date", "<=", optionalEndDate).get(getOptions).then(function(querySnapshot) {
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

                        if (results.declined_participants) {
                            userDoc.declined_participants = results.declined_participants;
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
            let refCollection = reference.collection(collection);
            refCollection.where('owner_id','==', uid).where("meeting_date.start_date", ">", optionalStartDate).where("meeting_date.start_date", "<=", optionalEndDate).get(getOptions).then(function(querySnapshot) {
                var users = new Array();

                async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
                    var userDoc = doc.data();
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

                        if (results.declined_participants) {
                            userDoc.declined_participants = results.declined_participants;
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
            "meetings": meetings.sort((a, b) => b - a)
        }

        completionHandler(err, data);
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
                "meetings": users.sort((a, b) => b - a)
            }
            completionHandler(err, data);
        });
    }).catch(function (error) {
        completionHandler(error, null);
    });  
}

function retrieveMeetingsById(collection, id, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection(collection);
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

                if (results.declined_participants) {
                    userDoc.declined_participants = results.declined_participants;
                }

                users.push(userDoc);
                completion();
            });
        }, function (err) {
            if (err) return completionHandler(err, null);
            let data = {
                "meetings": users.sort((a, b) => b - a)
            }
            completionHandler(err, data);
        });
    }).catch(function (error) {
        completionHandler(error, null);
    });  
}

function retrieveDraftMeetings(collection, uid, reference, completionHandler) {
    // Get the original user data
    // Get the additional information for user
    let refCollection = reference.collection(collection);
    refCollection.where('owner_id','==', uid).get(getOptions).then(function(querySnapshot) {
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
            }, function(error, results) {
                console.log(results);
                console.log(error);

                if (error) return completionHandler(error, null);

                if (results.owner) {
                    userDoc.owner = results.owner;
                }

                users.push(userDoc);
                completion();
            });
        }, function (err) {
            if (err) return completionHandler(err, null);
            let data = {
                "meetings": users.sort((a, b) => b - a)
            }
            completionHandler(err, data);
        });
    }).catch(function (error) {
        completionHandler(error, null);
    });  
}

function retrieveDraftMeetingById(collection, id, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection(collection);
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
                "meetings": users.sort((a, b) => b - a)
            }
            completionHandler(err, data);
        });
    }).catch(function (error) {
        completionHandler(error, null);
    });  
}

function updateMeetingForId(collection, data, id, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection(collection);
    refCollection.where('id', '==', id).get(getOptions).then(function(querySnapshot) {
        async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
            var object = new Object();

            var meetingParticipantsId = doc.data().meeting_participants_ids;
            console.log(typeof meetingParticipantsId !== 'undefined');
            if (typeof meetingParticipantsId !== 'undefined') {
                if (!meetingParticipantsId.includes(data)) {
                    meetingParticipantsId.push(data);
                    object['meeting_participants_ids'] = meetingParticipantsId;
                }
            } 

            var declinedMeetingPaticipantsIds = doc.data().decline_meeting_participants_ids;
            console.log(typeof declinedMeetingPaticipantsIds !== 'undefined');
            if (typeof declinedMeetingPaticipantsIds !== 'undefined') {
                object['decline_meeting_participants_ids'] = declinedMeetingPaticipantsIds.filter(function(participantId) {
                    return participantId !== data
                });
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

function updateStatusForMeetingForId(collection, data, id, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection(collection);
    refCollection.where('id', '==', id).get(getOptions).then(function(querySnapshot) {
        async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
            let object = {
                'meeting_status_id': data
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

function removeParticipantForMeeting(collection, data, id, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection(collection);
    refCollection.where('id', '==', id).get(getOptions).then(function(querySnapshot) {
        async.forEachOf(querySnapshot.docs, function(doc, key, completion) {
            var object = new Object();

            var meetingParticipantsId = doc.data().meeting_participants_ids;
            console.log(typeof meetingParticipantsId !== 'undefined');
            if (typeof meetingParticipantsId !== 'undefined') {
                object['meeting_participants_ids'] = doc.data().meeting_participants_ids.filter(function(participantId) {
                    return participantId !== data
                });
            }

            var declinedMeetingPaticipantsIds = doc.data().decline_meeting_participants_ids;
            console.log(typeof declinedMeetingPaticipantsIds !== 'undefined');
            if (typeof declinedMeetingPaticipantsIds !== 'undefined') {
                if (!declinedMeetingPaticipantsIds.includes(id)) {
                    // declinedMeetingPaticipantsIds = new Array();
                    declinedMeetingPaticipantsIds.push(data);
                    object['decline_meeting_participants_ids'] = declinedMeetingPaticipantsIds;
                }
            } else {
                // declinedMeetingPaticipantsIds = new Array();
                declinedMeetingPaticipantsIds = new Array(data);
                object['decline_meeting_participants_ids'] = declinedMeetingPaticipantsIds;
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

function sendEmail(to, withSubject, textPart, htmlPart, customID) {
    console.log(to);
    const request = mailJet
    .post("send", {'version': 'v3.1'})
    .request({
        "Messages":[
            {
                "From": {
                    "Email": "zara@theappcalledrooted.com",
                    "Name": "Zara from Rooted"
                },
                "To": to,
                "Subject": withSubject,
                "TextPart": textPart,
                "HTMLPart": htmlPart,
                "CustomID": customID
            }
        ]
    })
    request.then((result) => {
        console.log(result.body);
        // completionHandler(null, result);
    }).catch((err) => {
        console.log(err.statusCode);
        // completionHandler(err, null);
    })
}

function sendText(to, withSubject, textPart, htmlPart, customID) {
    console.log(to);
    const request = mailJet
    .post("send", {'version': 'v3.1'})
    .request({
        "Messages":[
            {
                "From": {
                    "Email": "zara@theappcalledrooted.com",
                    "Name": "Zara from Rooted"
                },
                "To": to,
                "Subject": withSubject,
                "TextPart": textPart,
                "HTMLPart": htmlPart,
                "CustomID": customID
            }
        ]
    })
    request.then((result) => {
        console.log(result.body);
        // completionHandler(null, result);
    }).catch((err) => {
        console.log(err.statusCode);
        // completionHandler(err, null);
    })
}

function retrieveUserObject(uid, reference, completionHandler) {
    // Get the original user data
    let refCollection = reference.collection('users');
    refCollection.where('uid','==', uid).get(getOptions).then(function(querySnapshot) {
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
                    // callback(null, null);
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
                }, 
                meetings: function(callback) {
                    // callback(null, null);
                    var accountTypes = new Array();
                    retrieveMeetings('meetings', userDoc.uid, moment().format(), moment().format(), reference, function(error, data) {
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
                completion();
            });
        }, function (err) {
            if (err) return completionHandler(err, null);
            let data = {
                "uid": uid,
                "user": users
            }
            completionHandler(err, data);
        });
    }).catch(function (error) {
        completionHandler(error, null);
    });  
}

module.exports = router;