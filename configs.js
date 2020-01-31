'use strict';

const path          = require('path');

module.exports = {
    port: 3000,
    siteTitle: 'Rooted',
    
    base: __dirname,
    basePublicPath: path.join(__dirname, '/public/'),
    baseRoutes: path.join(__dirname, '/routes/'),
    baseViews: path.join(__dirname, '/views/'),
    
    sessionDuration: 60 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    
    transporterClientId: '', //'69871664069-v7qfip8fn8sb1q0leh0kqlgeo8egojfk.apps.googleusercontent.com',
    transporterClientSecret: '', //'cDOqXWb93FojAXok0ODdSqh2',
    transporterRefreshToken: '', // '1/humTDmtJl9G9aDM55K8QX78VkRsZ2fuH5wRDl7kfASQ',
    
    mongoUrl: '', //'mongodb://dadhive-ad:'+encodeURIComponent('Z@r@rox6')+'@dadhive-cluster-sm-shard-00-00-1io7q.mongodb.net:27017,dadhive-cluster-sm-shard-00-01-1io7q.mongodb.net:27017,dadhive-cluster-sm-shard-00-02-1io7q.mongodb.net:27017/test?ssl=true&replicaSet=DadHive-Cluster-sm-shard-0&authSource=admin&retryWrites=true/dadhive-main-20193f0912h309',
    mongoid: '', // 'dadhive-main-20193f0912h309',

    jwtsecret: '3847gt38owr74uhiu3h589ew7gioseub5789egsot87wv4',
    jwtsecretLimit: 86400000,
    jwtrefresh: 'fbhs8o74gr875gt587ugo5t7o8475e4g5t4h9y8d5ho589i4uh4y589ho',
    jwtrefreshLimit: 1814400000,

    nodemailusr: '', //'thedadhive@gmail.com',
    nodemailpass: '', //'Kountdown_199120101',
    nodemailerclientid: '', //'582457802779-jse8ejpv5llk4s4qd8lol4uo3rbdj3o6.apps.googleusercontent.com',
    nodemailerclientsecret: '', //'_J64jVg1N-B-ixi0Y7sS0Ney',
    nodemailerclienttoken: '', // '1/Pr7qllTm6f88K0xTmFmyriECjPVhieQzDh_SeXGTXCIEc766NB--peL2RgDBeZDS',
    
    sessionCookieName: 'Rootedap93w8htrse4oe89gh9ows4t',
    sessionCookieSecret: 'r3498thw8ote89gd45oihiur5bgodr789',

    firapikey: 'AIzaSyDOopMpxlFi-7oVFMw_xbj8da9jLFY7qxQ',
    firauthdomain: 'rooted-f677e.firebaseapp.com', // 'dadhive-cc6f5.firebaseapp.com',
    firdburl: 'https://rooted-f677e.firebaseio.com',
    firprojectid: 'rooted-f677e',
    firstoragebucket: 'rooted-f677e.appspot.com',
    firmessagingsenderid: '837225967709',
    firstoragefilename: './rooted-f677e-7249c753c9f9.json',
    firappid: '1:837225967709:web:732f1795cc32a066e1ddb4',
    firmeasurementid: 'G-9JL08DX2B9',
    
    s3AccessKey: '',
    s3SecretKey: '',
    s3bucket: '',
    
    isLive: false,
    oneDay: 86400000,
    timeout: 72000000
}