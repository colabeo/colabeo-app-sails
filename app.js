// Start sails and pass it command line arguments
var sails=require('sails');

var DEVELOPMENT=1; // Dev Flag

// Default Password for all social networks
sails.DEFAULT_PASSWORD='abcd1234';

// Parse App Credentials
sails.PARSE_APP_ID = "qX7XUc4JLzh6Y3rvKYuLeELLKqHk3KAXQ4xgCoue";
sails.PARSE_JAVASCRIPT_KEY = "PhF8gvGcaWNBwWX24K7LG7wEEjIe0cVaTCtjtaXb";
sails.PARSE_MASTER_KEY = "a9M6qBsVNJU1Zap2eumLVKV09fB94aY9K4ZXdHe1";

// Firebase App Credentials
sails.FIREBASE_URL='https://koalalab-berry.firebaseio.com/';
sails.YOUR_FIREBASE_SECRET = 'EyziaFZwrpPxf8GoUOPsci9u6DCZhVzRhCjJX9VZ';

// Facebook App Credentials
if (DEVELOPMENT)  {
    sails.FACEBOOK_APP_ID = '1428317197384013';
    sails.FACEBOOK_APP_SECRET = 'd03fd6db99a7b1c5dd0d82b6d61126ca';
    sails.HOST_SERVER_URL = 'http://localhost:1337';
} //Development Facebook
else {
    sails.FACEBOOK_APP_ID = '686271008083898';
    sails.FACEBOOK_APP_SECRET = '6cbe30c8c9655e28f3a148876a819565';
    sails.HOST_SERVER_URL = 'https://dashboard.colabeo.com';
} //Production Facebook

// Google+ App Credentials
sails.GOOGLEPLUS_CLIENT_ID = '526862954475.apps.googleusercontent.com';
sails.GOOGLEPLUS_CLIENT_SECRET = 'r0wARG9mQuJxYFPGmYIzoYLH';
//sails.GOOGLEPLUS_CLIENT_ID = '406625335434.apps.googleusercontent.com';
//sails.GOOGLEPLUS_CLIENT_SECRET = 'AIzaSyAqPnCk3pwWgHCZS2FrgZFFGvdWBRU7er4';


// Start Server
sails.lift(require('optimist').argv);