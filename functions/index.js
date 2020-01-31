
const functions           = require('firebase-functions');
const admin               = require('firebase-admin');
const Firestore           = require('@google-cloud/firestore');
const request             = require('request')

admin.initializeApp();

const firestore = new Firestore({
    projectId: 'dadhive-cc6f5',
    timestampsInSnapshots: true,
});

exports.updateUserLocation = functions.firestore.document('users/{userId}').onUpdate((change, context) => {
    
    console.log(context.params);
    
    var beforeData = change.before.data();
    var afterData = change.after.data();

    if (beforeData.addressLat === afterData.addressLat && beforeData.addressLong === afterData.addressLong) return null;

    console.log(afterData);
    request.post('https://dadhive-test.herokuapp.com/api/v1/updateUserLocation', {
        json: {
            latitude: afterData.addressLat,
            longitude: afterData.addressLong,
            userId: afterData.uid,
        }
    }, (error, response, body) => {
        if (error) {
            console.error(error)
            return null;
        }
        res.status(200).json({
            "status": 200,
            "success": { "result" : true, "message" : "Request was successful" },
            "data": body,
            "error": null
        });
    });
});

exports.updateConversation = functions.database.ref('/messages/{pushId}/').onCreate((snapshot, context) => {
        
    var original = snapshot.val();
    console.log(original);
    request.post('https://dadhive-test.herokuapp.com/api/v1/updateConversation', {
        json: {
            origin: "function",
            conversationId: original.conversationId,
            message: original.message,
            createdAt: original.createdAt,
        }
    }, (error, response, body) => {
        if (error) {
            console.error(error)
            return null;
        }
        res.status(200).json({
            "status": 200,
            "success": { "result" : true, "message" : "Request was successful" },
            "data": body,
            "error": null
        });
    });
});