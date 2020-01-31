'use strict';

const MongoClient       = require('mongodb').MongoClient;
const configs           = require('./configs');

//  MARK:- Setup MongoDB App
var mongoUrl = process.env.mongoUrl || configs.mongoUrl;
var mongoid = process.env.mongoid || configs.mongoid;

var moClient;

function setupMongoClient(callback) {
    MongoClient.connect(mongoUrl, { useNewUrlParser: true }, function(err, client) {
        if (!err) {
            moClient = client
            callback(true)
        } else {
            console.log(err);
            callback(false);
        }
    })
}

module.exports.setup = function setup() {
    console.log('Setting up MongoDB');
    setupMongoClient(function(success) {
        if (success) {
            console.log("Successfully set up mongo client");
        } else {
            console.log("Unsuccessfully set up mongo client");
        }
    });
};

module.exports.mongodb_client = function returnMongoDBMainObject(callback) {
    callback(moClient);
}

// Create a module export per each collection in MongoDB database
/** Example
    module.exports.usergeo = function returnMongoUserGeoDB(callback) {
        var db = moClient.db(mongoid);
        var collection = db.collection('user-geo');
        callback(collection);
    }

    module.exports.actioncol = function returnMongoUserGeoDB(callback) {
        var db = moClient.db(mongoid);
        var collection = db.collection('action');
        callback(collection);
    }

    module.exports.mapitemcol = function returnMongoMapItemGeoDB(callback) {
        var db = moClient.db(mongoid);
        var collection = db.collection('map-items');
        callback(collection);
    }

    module.exports.convoscol = function returnMongoUserGeoDB(callback) {
        var db = moClient.db(mongoid);
        var collection = db.collection('conversations');
        callback(collection);
    }

    module.exports.postscol = function returnMongoUserGeoDB(callback) {
        var db = moClient.db(mongoid);
        var collection = db.collection('posts');
        callback(collection);
    }

    module.exports.categoriescol = function returnMongoUserGeoDB(callback) {
        var db = moClient.db(mongoid);
        var collection = db.collection('categories');
        callback(collection);
    }

    module.exports.engagementscol = function returnMongoUserGeoDB(callback) {
        var db = moClient.db(mongoid);
        var collection = db.collection('engagements');
        callback(collection);
    }

    module.exports.likesscol = function returnMongoUserGeoDB(callback) {
        var db = moClient.db(mongoid);
        var collection = db.collection('likes');
        callback(collection);
    }

    module.exports.notificationscol = function returnMongoUserGeoDB(callback) {
        var db = moClient.db(mongoid);
        var collection = db.collection('notifications');
        callback(collection);
    }
*/