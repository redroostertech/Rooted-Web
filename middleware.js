const jwt               = require('jsonwebtoken');
const configs           = require('./configs');
const _                 = require('underscore');

var oneDay = process.env.oneDay || configs.oneDay;
var jwtsecret = process.env.jwtsecret || configs.jwtsecret;
var jwtsecretLimit = process.env.jwtsecretLimit || configs.jwtsecretLimit;
var jwtrefresh = process.env.jwtrefresh || configs.jwtrefresh;
var jwtrefreshLimit = process.env.jwtrefreshLimit || configs.jwtrefreshLimit;

let isSessionActive = (req, res, next) => {
  let session = req.Rootedap93w8htrse4oe89gh9ows4t;
  let sessionCheckValue = !(_.isEmpty(session)) && (session !== null || typeof session !== 'undefined')
  
  req.body.isSessionActive = sessionCheckValue;

  if (sessionCheckValue) {
    res.redirect('/home');
  } else {
    next();
  }
}

let checkToken = (req, res, next) => {
  let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase
  if (typeof token === 'undefined') {
    return res.status(200).json({
      "status": 200,
      "success": { "result" : false, "message" : "Token is not valid." },
      "data": null,
      "error": { 
        "message" : "Token is not valid." 
      }
    });
  }
  if (token.startsWith('Bearer ')) {
    // Remove Bearer from string
    token = token.slice(7, token.length);
  }

  if (token) {
    jwt.verify(token, jwtsecret, (err, decoded) => {
      if (err) {
        return res.status(200).json({
          "status": 200,
          "success": { "result" : false, "message" : "Token is not valid." },
          "data": null,
          "error": err
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.status(200).json({
      "status": 200,
      "success": { "result" : false, "message" : "Auth token is not supplied." },
      "data": null,
      "error": { 
        "message" : "Token is not valid." 
      }
    });
  }
};

let homeCheck = (req, res, next) => {
  let token = req.Rootedap93w8htrse4oe89gh9ows4t.refresh;
  jwt.verify(token, jwtrefresh, (err, decoded) => {
    if (err) {
      console.log("SessionCheck doesn't exist.");
      next();
    } else {
      console.log("SessionCheck exists.");
      return res.redirect('/home');
    }
  });
}

let sessionCheck = (req, res, next) => {
  let token = req.Rootedap93w8htrse4oe89gh9ows4t.refresh;
  jwt.verify(token, jwtrefresh, (err, decoded) => {
    if (err) {
      console.log("SessionCheck doesn't exist.");
      next();
    } else {
      console.log("SessionCheck exists.");
      return res.redirect('/home');
    }
  });
}

let checkSession = (req, res, next) => {
  let token = req.Rootedap93w8htrse4oe89gh9ows4t.refresh;
  jwt.verify(token, jwtrefresh, (err, decoded) => {
    if (err) {
      console.log("CheckSession doesn't exist.");
      return res.redirect('/login');
    } else {
      console.log("CheckSession exists.");
      next();
    }
  });
}

let signoutCheck = (req, res, next) => {
  let token = req.Rootedap93w8htrse4oe89gh9ows4t.refresh;
  jwt.verify(token, jwtrefresh, (err, decoded) => {
    if (err) {
      console.log("Session doesn't exist.");
      console.log(err);
      return res.status(200).json({
        "status": 200,
        "success": { "result" : false, "message" : "Signout was unsuccessful" },
        "data": null,
        "error": null
    });
    } else {
      console.log("Session exists.");
      next();
    }
  });
}

module.exports = {
  checkToken: checkToken,
  sessionCheck: sessionCheck,
  checkSession: checkSession,
  signoutCheck: signoutCheck,
  homeCheck: homeCheck,
  isSessionActive: isSessionActive
}