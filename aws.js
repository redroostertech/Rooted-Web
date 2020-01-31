'use strict';

const AWS                 = require('aws-sdk');
const configs             = require('./configs.js');

var s3; 

var s3AccessKey = process.env.s3AccessKey || configs.s3AccessKey;
var s3SecretKey = process.env.s3SecretKey || configs.s3SecretKey;

function setup() {
    console.log('Setting up AWS & S3');
    AWS.config.update({
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey
    });
    s3 = new AWS.S3();
}

module.exports.setup = function awsSetup() {
    setup();
};

module.exports.s3 = s3;