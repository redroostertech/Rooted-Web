const express                           = require('express');
const configs                           = require('../../../configs');
const path                              = require('path');
const router                            = express.Router();
const bodyParser                        = require('body-parser');
const session                           = require('client-sessions');
const _                                 = require('underscore');
const rp                                = require('request-promise');

router.use(bodyParser.json({ limit: '500mb' }));
router.use(bodyParser.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));
router.use(express.static(configs.basePublicPath, { maxage: configs.oneDay * 21 }));
router.use(session(configs.appSession));

// This is the primary UI
router.get('/events/:id', function(req, res) {

    console.log(req.params.id);
    let session = req.Rootedap93w8htrse4oe89gh9ows4t;
    let sessionCheckValue = !(_.isEmpty(session)) && (session !== null || typeof session !== 'undefined')
  
    if (sessionCheckValue) {
        res.status('200').render('admin/event_detail.ejs', {
            "message" : "Test POST request.",
            "page" : {
                "title": configs.siteTitle,
                "session": {
                    "isSessionActive": sessionCheckValue,
                    "data": req.Rootedap93w8htrse4oe89gh9ows4t,
                }
            }
        });
    } else {
        var options = {
            method: "POST",
            uri: req.protocol + '://' + req.get('host') + '/api/v1/core/eggman',
            body: {
                action: 'retrieve_meeting_for_id',
                meeting_id: req.params.id,
            },
            headers: {
                "User-Agent": "Rooted-web-api-Request",
                "content-type": "application/json"
            },
            json: true //Parse the JSON string in the response
        };
    
        rp(options).then(function(response) {
            console.log(response);
            if (response.success === false) return res.status('200').render('admin/pages_error500.ejs', {
                "message" : "Test POST request.",
                "page" : {
                    "title": configs.siteTitle,
                    "session": {
                        "isSessionActive": sessionCheckValue,
                        "data": req.Rootedap93w8htrse4oe89gh9ows4t,
                    },
                    "data": {
                        "meetingId": req.params.id,
                        "errorMessage": response.error_message
                    }
                }
            });
            response.meetingId = req.params.id;
            res.status('200').render('admin/event_detail.ejs', {
                "message" : "Test POST request.",
                "page" : {
                    "title": configs.siteTitle,
                    "session": {
                        "isSessionActive": sessionCheckValue,
                        "data": req.Rootedap93w8htrse4oe89gh9ows4t,
                    },
                    "data": response.data
                }
            });
        }).catch(function(err) {
            console.log("API call failed, reason ", err);
            res.status('200').render('admin/pages_error404.ejs', {
                "message" : "Test POST request.",
                "page" : {
                    "title": configs.siteTitle,
                    "session": {
                        "isSessionActive": sessionCheckValue,
                        "data": req.Rootedap93w8htrse4oe89gh9ows4t,
                    },
                    "data": {
                        "meetingId": req.params.id,
                        "errorMessage": err.errorMessage
                    }
                }
            });
        });
    }
});

module.exports = router;