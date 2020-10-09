'use strict';

var firebase            = require('firebase');
var admin               = require('firebase-admin');
var configs             = require('./configs');
var FCM                 = require('fcm-node');
const { Storage }         = require('@google-cloud/storage');

require("firebase/auth");
require("firebase/database");
require("firebase/messaging");
require("firebase/functions");
require("firebase/storage");
require("firebase/firestore");

var firapikey = process.env.firapikey || configs.firapikey;
var firauthdomain = process.env.firauthdomain || configs.firauthdomain;
var firdburl = process.env.firdburl || configs.firdburl;
var firprojectid = process.env.firprojectid || configs.firprojectid;
var firstoragebucket = process.env.firstoragebucket || configs.firstoragebucket;
var firmessagingsenderid = process.env.firmessagingsenderid || configs.firmessagingsenderid;
var firstoragefilename = process.env.firstoragefilename || configs.firstoragefilename;

var serviceAccount      = require(firstoragefilename);  //  MARK:- Uncomment and provide url to service account .json file.

//  MARK:- Setup Firebase App
var firebaseObj;
var firebaseAdmin;
var firbaseStorage;
var firebaseFirestoreDB; 
var firebaseRealtimeDB;
var fcm;

var serviceAccount = require(firstoragefilename);  //  MARK:- Uncomment and provide url to service account .json file.
var settings = { timestampsInSnapshots: true };

var firebase_configuration = {
    apiKey: firapikey,
    authDomain: firauthdomain,
    databaseURL: firdburl,
    projectId: firprojectid,
    storageBucket: firstoragebucket,
    messagingSenderId: firmessagingsenderid,
};

function setupFirebaseApp(callback) {
    if (!firebase.apps.length) {
        firebaseObj = firebase.initializeApp(firebase_configuration);
    } else {
        firebaseObj = firebase.app();
    }
    callback();
}

function setupAdminFirebaseApp(callback) {
    firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: firdburl,
        storageBucket: firstoragebucket
    });
    callback();
}

function setupRealtimeDB(callback) {
    firebaseRealtimeDB = firebase.database();
    callback();
}

function setupFirestoreDB(callback) {
    firebaseFirestoreDB = admin.firestore()
    firebaseFirestoreDB.settings(settings);
    callback();
}

function setupFirebaseStorage(callback) {
    firbaseStorage = new Storage({
        projectId: firprojectid,
        keyFilename: firstoragefilename
    });
    callback();
}

function setupFCM(callback) {
    fcm = new FCM(serviceAccount);
    callback();
}

module.exports.setup = function firebaseSetup() {
    console.log('Setting up Firebase');
    setupFirebaseApp(function() {
        console.log('Completed setting up base firebase app');
    });
    setupAdminFirebaseApp(function() {
        console.log('Completed setting up base firebase admin app');
    });
    setupRealtimeDB(function() {
        console.log('Completed setting up base realtime db');
    });
    setupFirestoreDB(function() {
        console.log('Completed setting up base firebase firestore db');
    });
    setupFirebaseStorage(function() {
        console.log('Completed setting up base firebase storage app');
    });
    setupFCM(function() {
        console.log('Completed setting up FCM object');
    });
};
module.exports.firebase_main = function returnFirebaseMainObject(callback) {
    callback(firebaseObj);
}
module.exports.firebase_admin = function setupAdminFirebaseApp(callback) {
    callback(firebaseAdmin);
};
module.exports.firebase_firestore_db = function setupFirestore(callback) {
    callback(firebaseFirestoreDB);
}
module.exports.firebase_realtime_db = function setupRealtimeDB(callback) {
    callback(firebaseRealtimeDB);
}
module.exports.firebase_auth = function setupAuth(callback) {
    callback(firebaseObj.auth());
}
module.exports.firebase_storage = function setupStorage(callback) {
    callback(firbaseStorage.bucket(configs.firstoragebucket));
}
module.exports.fcm = function setupFCM(callback) {
    callback(fcm);
}