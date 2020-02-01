const express                           = require('express');
const path                              = require('path');
const router                            = express.Router();
const main                              = require('../../../app');
const bodyParser                        = require('body-parser');
const session                           = require('client-sessions');
const formidable                        = require('formidable');
const _                                 = require('underscore');
const mime                              = require('mime');
const configs                           = require('../../../configs');
const middleware                        = require('../../../middleware');

//  Add projects below
const serverFunctions                  = require('../../functions/index');

var oneDay = process.env.oneDay || configs.oneDay;
var basePublicPath = path.join(__dirname, '/public/')
var sessionCookieName = process.env.sessionCookieName || configs.sessionCookieName;
var sessionCookieSecret = process.env.sessionCookieSecret || configs.sessionCookieSecret;
var sessionDuration = process.env.sessionDuration || configs.sessionDuration;
var activeDuration = process.env.activeDuration || configs.activeDuration;


router.use(express.static(basePublicPath, {
    maxage: Number(oneDay) * 21
}));
router.use(bodyParser.urlencoded({extended:true}));
router.use(bodyParser.json());
router.use(session({
    cookieName: sessionCookieName,
    secret: sessionCookieSecret,
    duration: Number(sessionDuration),
    activeDuration: Number(activeDuration),
}));

router.post('/testWithToken', middleware.checkToken, function(req, res) {
    res.json({
        "message" : "Test POST request.",
        "data" : req.body,
        "page" : {
            "title": "DadHive",
            "session": {
                "isSessionActive": !(req.session !== null || typeof req.session !== 'undefined'),
                "data": req.session
            }
        }
    });
});

router.post('/testWithoutToken', function(req, res) {
    res.json({
        "message" : "Test POST request.",
        "data" : {
            "property": "test"
        },
        "page" : {
            "title": configs.siteTitle,
            "session": {
                "isSessionActive": !(req.session !== null || typeof req.session !== 'undefined'),
                "data": req.session
            }
        }
    });
});

router.get('/analytics', function(req, res) {
    res.json({
        "message" : "Test POST request.",
        "data" : {
            "property": "test"
        },
        "page" : {
            "title": configs.siteTitle,
            "session": {
                "isSessionActive": !(req.session !== null || typeof req.session !== 'undefined'),
                "data": req.session
            }
        }
    });
});

// MARK: - Login functionality should be reserved for web platform
// Web platform not available. 

router.post('/login', function( req, res ) {
    serverFunctions.signin(req, res);
});

router.post('/createUser', function(req, res) {
    serverFunctions.signup(req, res, function(uid, token, refresh) {
        if (uid === null || token === null || refresh === null) { 
            var error = {
                "code": 200,
                "message": "Something went wrong. Please try again later."
            }
            console.log(error);
            serverFunctions.sendResponse(200, error, null, null, res)
        } else {
            req.body.uid = uid
            req.body.token = token
            req.body.refreshToken = refresh
            serverFunctions.createUserMongoDB(req, res);
        }
    });
});

router.get('/signout', function(req, res) {
    serverFunctions.signout(req, res, function(success){
        res.redirect('/');
    });
});

router.post('/getUser', function(req, res) {
    console.log(req.body);
    serverFunctions.getUserMongoDB(req, res);
});

router.post('/createMatch', function(req, res) {
    console.log(req.body);
    serverFunctions.createMatchMongoDB(req, res);
});

router.post('/getMatches', function(req, res) {
    console.log(req.body);
    serverFunctions.getMatchesMongoDB(req, res);
});

router.post('/deleteMatch', function(req, res) {
    console.log(req.body);
    serverFunctions.deleteMatchMongoDB(req, res);
});

router.post('/deleteConversation', function(req ,res) {
    console.log(req.body);
    serverFunctions.deleteConversationWithParticipantsMongoDB(req, res);
});

router.post('/addParticipant', function(req, res) {
    console.log(req.body);
    serverFunctions.addParticipantMongoDB(req, res);
});

router.post('/removeParticipant', function(req, res) {
    console.log(req.body);
    serverFunctions.removeParticipantMongoDB(req, res);
});

router.post('/createConversation', function(req, res) {
    console.log(req.body);
    serverFunctions.createConversationMongoDB(req, res);
});

router.post('/findConversations', function(req, res) {
    console.log(req.body);
    serverFunctions.getConversationsMongoDB(req, res);
});

router.post('/getUsersInConversation', function(req, res) {
    console.log(req.body);
    serverFunctions.getUsersInConversationMongoDB(req, res);
});

router.post('/sendMessageCheck', function(req, res) {
    console.log(req.body);
    serverFunctions.sendMessageMongoDB(req, res);
});

router.post('/saveLocation', function(req, res) {
    console.log(req.body);
    serverFunctions.saveLocationMongoDB(req, res);
});

router.post('/editUserProfile', function(req, res) {
    console.log(req.headers);
    console.log(req.body);
    if (req.headers['agent'] === "web") {
        serverFunctions.editUser(req, res);
    } else {
        serverFunctions.editUserMongoDB(req, res);
    }
});

router.post('/getNearbyUsers', function(req, res) {
    console.log(req.body);
    serverFunctions.getNearByUsersMongoDB(req, res);
});

router.post('/retrieveForMap', function(req, res) {
    console.log(req.body);
    serverFunctions.retrieveForMapMongoDB(req, res);
});

router.post('/reportUser', function(req, res) {
    serverFunctions.reportUser(req, res);
});

router.get('/getCategories', function(req, res) {
    console.log(req.body);
    serverFunctions.retrieveAllCategoriesMongoDB(req, res);
});

router.post('/addCategory', function(req, res) {
    console.log(req.body);
    serverFunctions.addCategoryMongoDB(req, res);
});

router.post('/addPost', function(req, res) {
    console.log(req.body);
    serverFunctions.addPostMongoDB(req, res);
});

router.post('/getPosts', function(req, res) {
    console.log(req.body);
    serverFunctions.retrieveAllPostsMongoDB(req, res);
});

router.post('/getPostsByCategory', function(req, res) {
    console.log(req.body);
    serverFunctions.retrievePostsByCategoryMongoDB(req, res);
});

router.post('/addEngagement', function(req, res) {
    console.log(req.body);
    serverFunctions.addLikeMongoDB(req, res);
});

router.post('/getCommentsForPost', function(req, res) {
    console.log(req.body);
    serverFunctions.retrieveCommentsByPostMongoDB(req, res);
});

router.post('/getActivityForUser', function(req, res) {
    console.log(req.body);
    serverFunctions.retrieveActivityForUserMongoDB(req, res);
});

router.post('/getUserActivity', function(req, res) {
    console.log(req.body);
    serverFunctions.retrieveOthersActivityForUserMongoDB(req, res);
});

router.post('/searchForPost', function(req, res) {
    console.log(req.body);
    serverFunctions.retrievePostsBySearchMongoDB(req, res);
});

router.post('/reportPost', function(req, res) {
    serverFunctions.reportPost(req, res);
});

router.post('/blockPost', function(req, res) {
    serverFunctions.blockPostMongoDB(req, res);
});

router.post('/blockUser', function(req, res) {
    serverFunctions.blockUserMongoDB(req, res);
});

router.post('/deletePost', function(req, res) {
    serverFunctions.deletePostMongoDB(req, res);
});

router.post('/getPostsByUser', function(req, res) {
    console.log(req.body);
    serverFunctions.retrievePostsByUserMongoDB(req, res);
});

router.post('/getBlockedUsers', function(req, res) {
    console.log(req.body);
    serverFunctions.retrieveBlockedUsersMongoDB(req, res);
});

router.post('/unblockUser', function(req, res) {
    console.log(req.body);
    serverFunctions.unblockUserMongoDB(req, res);
});

router.post('/requestForDelete', function(req, res) {
    console.log(req.body);
    serverFunctions.requestProfileDeletion(req, res);
});

// MARK: - Reserved for Cloud Functions
router.post('/updateConversation', function(req, res) {
    console.log(req.body);
    serverFunctions.updateConversationMongoDB(req, res);
});

// MARK: - Reserved for ADMIN
router.get('/getUsers', function(req, res) {
    console.log(req.body);
    serverFunctions.getUsersMongoDB(req, res);
});

router.get('/deleteAllGeos', function(req, res) {
    console.log(req.body);
    serverFunctions.deleteAllMongoUserGeoElements(req, res);
});

router.post('/deleteGeo', function(req, res) {
    console.log(req.body);
    serverFunctions.deleteGeo(req, res);
});

router.post('/deleteGeosBut', function(req, res) {
    req.body.ids = ["5cf87bf7178341c6ca36ca92", "5cf87f3c178341c6ca37481b"];
    serverFunctions.deleteGeosBut(req, res);
})

router.get('/deleteAllActions', function(req, res) {
    console.log(req.body);
    serverFunctions.deleteAllMongoActionElements(req, res);
});

router.post('/deleteAction', function(req, res) {
    console.log(req.body);
});

router.post('/deleteUser', function(req, res) {
    serverFunctions.deleteUser(req, res);
});

router.post('/deleteAllEngagements', function(req, res) {
    serverFunctions.deleteAllMongoEngagementElements(req, res);
});

router.post('/deleteAllNotifications', function(req, res) {
    serverFunctions.deleteAllMongoNotificationElements(req, res);
});

router.post('/sendPushNotifications', function(req, res) {
    serverFunctions.sendPushNotifications(req, res);
});

// MARK: - Not used
router.post('/uploadPhoto', function(req, res) {

    var form = new formidable.IncomingForm();
    var imageData = {};

    form.parse(req, function (err, fields, files) {
        if (!err) {
            console.log(fields);
            var finished = _.after(parseInt(fields.imageCount), check);
            main.firebase.firebase_storage(function(firebase) {
                for (i = 0; i < parseInt(fields.imageCount); i++) {
                    var file = files[fields.imageCount+(i+1)];
                    var fileMime = mime.getType(file.name);
                    var fileExt = mime.getExtension(file.type);
                    var uploadTo = 'images/' + fields.userId + '/' + 'profileImage'+(i+1) + '.' + fileExt;
                    firebase.upload(file.path, { 
                        destination: uploadTo,
                        public: true,
                        metadata: {
                            contentType: fileMime,
                            cacheControl: "public, max-age=300"
                        }
                    }, function(err, file) {
                        if (err) { 
                            console.log('Error uploading file: ' + err);
                            finished();
                        } else {
                            var count = i+1;
                            imageData["userProfilePicture_"+count+"_url"] = serverFunctions.createPublicFileURL(uploadTo); 
                            imageData["userProfilePicture_"+count+"_meta"] = null;
                            finished();
                        }
                    });
                }
            });

            function check() {
                serverFunctions.uploadPicture(imageData, res);
            }

        }
    });
});

router.post('/addToMap', function(req, res) {
    console.log(req.body);
    serverFunctions.createMapItem(req, res, function(itemId) {
        req.body.itemId = itemId
        serverFunctions.addToMap(req, res);
    });
});

router.post('/getMessages', function(req, res) {
    console.log(req.body);
    serverFunctions.getMessagesInConversation(req.body.conversationId, res);
});

// MARK: - Reserved for ADMIN
router.get('/getUsers', function(req, res) {
    console.log(req.body);
    serverFunctions.getUsersMongoDB(req, res);
});

router.get('/deleteAllGeos', function(req, res) {
    console.log(req.body);
    serverFunctions.deleteAllMongoUserGeoElements(req, res);
});

router.post('/deleteGeo', function(req, res) {
    console.log(req.body);
    serverFunctions.deleteGeo(req, res);
});

router.post('/deleteGeosBut', function(req, res) {
    req.body.ids = ["5cf87bf7178341c6ca36ca92", "5cf87f3c178341c6ca37481b"];
    serverFunctions.deleteGeosBut(req, res);
})

router.get('/deleteAllActions', function(req, res) {
    console.log(req.body);
    serverFunctions.deleteAllMongoActionElements(req, res);
});

router.post('/deleteAction', function(req, res) {
    console.log(req.body);
});

router.post('/deleteUser', function(req, res) {
    serverFunctions.deleteUser(req, res);
});

router.post('/deleteAllEngagements', function(req, res) {
    serverFunctions.deleteAllMongoEngagementElements(req, res);
});

router.post('/deleteAllNotifications', function(req, res) {
    serverFunctions.deleteAllMongoNotificationElements(req, res);
});

module.exports = router;