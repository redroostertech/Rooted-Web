'use strict';

const path = require('path');

const port = 3000;
const site_title = 'Rooted';
const base = __dirname;

const transporter_client_id = ''; //'69871664069-v7qfip8fn8sb1q0leh0kqlgeo8egojfk.apps.googleusercontent.com',
const transporter_client_secret = ''; //'cDOqXWb93FojAXok0ODdSqh2',
const transporter_refresh_token = ''; // '1/humTDmtJl9G9aDM55K8QX78VkRsZ2fuH5wRDl7kfASQ',

const mongo_url = ''; //'mongodb://dadhive-ad:'+encodeURIComponent('Z@r@rox6')+'@dadhive-cluster-sm-shard-00-00-1io7q.mongodb.net:27017,dadhive-cluster-sm-shard-00-01-1io7q.mongodb.net:27017,dadhive-cluster-sm-shard-00-02-1io7q.mongodb.net:27017/test?ssl=true&replicaSet=DadHive-Cluster-sm-shard-0&authSource=admin&retryWrites=true/dadhive-main-20193f0912h309',
const mongo_id = ''; // 'dadhive-main-20193f0912h309',

const jwt_secret = '3847gt38owr74uhiu3h589ew7gioseub5789egsot87wv4';
const jwt_secret_limit = 86400000;
const jwt_refresh = 'fbhs8o74gr875gt587ugo5t7o8475e4g5t4h9y8d5ho589i4uh4y589ho';
const jwt_refresh_limit = 1814400000;

const nodemail_usr = ''; //'thedadhive@gmail.com';
const nodemail_pass = ''; //'Kountdown_199120101';
const nodemailer_client_id = ''; //'582457802779-jse8ejpv5llk4s4qd8lol4uo3rbdj3o6.apps.googleusercontent.com';
const nodemailer_client_secret = ''; //'_J64jVg1N-B-ixi0Y7sS0Ney';
const nodemailer_client_token = ''; // '1/Pr7qllTm6f88K0xTmFmyriECjPVhieQzDh_SeXGTXCIEc766NB--peL2RgDBeZDS';

const session_cookie_name = 'Rootedap93w8htrse4oe89gh9ows4t';
const session_cookie_secret = 'r3498thw8ote89gd45oihiur5bgodr789';
const session_duration = 60 * 60 * 1000;
const session_active_duration = 5 * 60 * 1000;

const fir_api_key = 'AIzaSyDOopMpxlFi-7oVFMw_xbj8da9jLFY7qxQ';
const fir_auth_domain = 'rooted-f677e.firebaseapp.com'; // 'dadhive-cc6f5.firebaseapp.com';
const fir_db_url = 'https://rooted-f677e.firebaseio.com';
const fir_project_id = 'rooted-f677e';
const fir_storage_bucket = 'rooted-f677e.appspot.com';
const fir_messaging_sender_id = '837225967709';
const fir_storage_filename = './rooted-f677e-7249c753c9f9.json';
const fir_app_id = '1:837225967709:web:732f1795cc32a066e1ddb4';
const fir_measurement_id = 'G-9JL08DX2B9';

const s3_access_key = '';
const s3_secret_key = '';
const s3_bucket = '';

const is_live = false;
const one_day = 86400000;
const timeout = 72000000;

module.exports = {
    port: port,
    siteTitle: site_title,
    
    basePublicPath: path.join(base, '/public/'),
    baseRoutes: path.join(base, '/routes/'),
    baseViews: path.join(base, '/views/'),
    
    sessionDuration: session_duration,
    activeDuration: session_active_duration,
    
    transporterClientId: transporter_client_id,
    transporterClientSecret: transporter_client_secret,
    transporterRefreshToken: transporter_refresh_token,
    
    mongoUrl: mongo_url,
    mongoid: mongo_id,

    jwtsecret: jwt_secret,
    jwtsecretLimit: jwt_secret_limit,
    jwtrefresh: jwt_refresh,
    jwtrefreshLimit: jwt_refresh_limit,

    nodemailusr: nodemail_usr,
    nodemailpass: nodemail_pass,
    nodemailerclientid: nodemailer_client_id,
    nodemailerclientsecret: nodemailer_client_secret,
    nodemailerclienttoken: nodemailer_client_token,
    
    sessionCookieName: session_cookie_name,
    sessionCookieSecret: session_cookie_secret,

    firapikey: fir_api_key,
    firauthdomain: fir_auth_domain,
    firdburl: fir_db_url,
    firprojectid: fir_project_id,
    firstoragebucket: fir_storage_bucket,
    firmessagingsenderid: fir_messaging_sender_id,
    firstoragefilename: fir_storage_filename,
    firappid: fir_app_id,
    firmeasurementid: fir_measurement_id,
    
    s3AccessKey: s3_access_key,
    s3SecretKey: s3_secret_key,
    s3bucket: s3_bucket,
    
    isLive: is_live,
    oneDay: one_day,
    timeout: timeout,

    appSession: {
        cookieName: process.env.COOKIENAME || session_cookie_name,
        secret: process.env.COOKIESEC || session_cookie_secret,
        duration: process.env.PROCESSDURATION || session_duration,
        activeDuration: process.env.ACTIVEDURATION || session_active_duration
    }
}