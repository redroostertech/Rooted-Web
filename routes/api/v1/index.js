const express                           = require('express');
const path                              = require('path');
const router                            = express.Router();
const configs                           = require('../../../configs');
const bodyParser                        = require('body-parser');
const session                           = require('client-sessions');
const formidable                        = require('formidable');
const _                                 = require('underscore');
const mime                              = require('mime');

router.use(bodyParser.json({ limit: '500mb' }));
router.use(bodyParser.urlencoded({ limit: '500mb', extended: true, parameterLimit: 50000 }));
router.use(express.static(configs.basePublicPath, { maxage: configs.oneDay * 21 }));
router.use(session(configs.appSession));

//  MARK:- Set up routes.
var analyticsApiController = require(path.join(configs.baseRoutes, '/api/v1/analytics/api_analytics.js'));
var authenticationController = require(path.join(configs.baseRoutes, '/api/v1/authentication/api_auth.js'));
var superAdminController = require(path.join(configs.baseRoutes, '/api/v1/supra/api_super.js'));
var coreApiController = require(path.join(configs.baseRoutes, '/api/v1/core/core.js'));

//  MARK:- Use Routes
router.use('/analytics', analyticsApiController);
router.use('/auth', authenticationController);
router.use('/admin', superAdminController);
router.use('/core', coreApiController);

module.exports = router;