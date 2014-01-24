var sails = require('sails');
var Parse = require('parse').Parse;

Parse.initialize(sails.PARSE_APP_ID, sails.PARSE_JAVASCRIPT_KEY, sails.PARSE_MASTER_KEY);