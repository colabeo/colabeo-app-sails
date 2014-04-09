// Start sails and pass it command line arguments
var sails=require('sails');

var os = require("os");
var hoststring = os.hostname();

var DEVELOPMENT=hoststring.match("local"); // Dev Flag
//DEVELOPMENT=1;  // for Windows

sails.DEVELOPMENT=DEVELOPMENT;
// Default Password for all social networks
sails.DEFAULT_PASSWORD='abcd1234';
// Cookie life-cycle
sails.COOKIE_LIFECYCLE=30 * 24 * 60 * 60 * 1000; //a month

// Parse App Credentials
sails.PARSE_APP_ID = "qX7XUc4JLzh6Y3rvKYuLeELLKqHk3KAXQ4xgCoue";
sails.PARSE_JAVASCRIPT_KEY = "PhF8gvGcaWNBwWX24K7LG7wEEjIe0cVaTCtjtaXb";
sails.PARSE_MASTER_KEY = "a9M6qBsVNJU1Zap2eumLVKV09fB94aY9K4ZXdHe1";

if (DEVELOPMENT)  {
    console.log("************** Development *****************");
    // Facebook App Credentials
    sails.FACEBOOK_APP_ID = '1428317197384013';
    sails.FACEBOOK_APP_SECRET = 'd03fd6db99a7b1c5dd0d82b6d61126ca';
    sails.HOST_SERVER_URL = 'http://localhost:1337';

    // Firebase App Credentials
    sails.FIREBASE_URL='https://koalalab-berry.firebaseio.com/';
    sails.YOUR_FIREBASE_SECRET = 'EyziaFZwrpPxf8GoUOPsci9u6DCZhVzRhCjJX9VZ';

    // Google+ App Credentials
    sails.GOOGLEPLUS_CLIENT_ID = '526862954475.apps.googleusercontent.com';
    sails.GOOGLEPLUS_CLIENT_SECRET = 'r0wARG9mQuJxYFPGmYIzoYLH';

    // Google Auth Credentials
    sails.GOOGLE_AUTH_CLIENT_ID = '406625335434-2nur016vm6srttpmtle8767goucs571d.apps.googleusercontent.com';
    sails.GOOGLE_AUTH_CLIENT_SECRET = '1AJzbnUsKlKZT04LoPqVR9IH';
    
    // Google Connect Credentials
    sails.GOOGLE_CONNECT_CLIENT_ID = '406625335434-009hdb2qpv8le0v2pn0kj631fjltnhkn.apps.googleusercontent.com';
    sails.GOOGLE_CONNECT_CLIENT_SECRET = 'FIH9T8rkXagBW8_UWOen4csA';

    sails.GITHUB_CONNECT_CLIENT_ID = 'a692bb0475f59eaf95c1';
    sails.GITHUB_CONNECT_CLIENT_SECRET = 'fa47117620f8ec110504bbb0f219ee2b8980b22a';

    sails.TWITTER_OAUTH_CLIENT_ID = 'Hv7SUemRQ3vrIwZJ7Df66A';
    sails.TWITTER_OAUTH_CLIENT_SECRET = 'FXj77nFhLydfiHoV2dem90kEnAz2T2yDT9BE70bNl88';

} else {
    console.log("************** Production *****************");
    sails.FACEBOOK_APP_ID = '648143008577417';
    sails.FACEBOOK_APP_SECRET = 'a27ff3173af0394f038c609a65c09a93';
    sails.HOST_SERVER_URL = 'https://beepe.me';

    // Firebase App Credentials
    // TODO: firebase prod settings
    sails.FIREBASE_URL='https://koalalab-berry.firebaseio.com/';
    sails.YOUR_FIREBASE_SECRET = 'EyziaFZwrpPxf8GoUOPsci9u6DCZhVzRhCjJX9VZ';

    // Google+ App Credentials
    sails.GOOGLEPLUS_CLIENT_ID = '406625335434.apps.googleusercontent.com';
    sails.GOOGLEPLUS_CLIENT_SECRET = 'AIzaSyAqPnCk3pwWgHCZS2FrgZFFGvdWBRU7er4';

    // Google Auth Credentials
    sails.GOOGLE_AUTH_CLIENT_ID = '575666662072-u62f6q9869q5sh0q8c8jc3r34soiacif.apps.googleusercontent.com';
    sails.GOOGLE_AUTH_CLIENT_SECRET = 'a3HvIj5yzo9aTqLKNLeELSn4';
    
    // Google Connect Credentials
    sails.GOOGLE_CONNECT_CLIENT_ID = '575666662072-mfpa2ci9me3lr0vpkvoqu2n2lin4urpn.apps.googleusercontent.com';
    sails.GOOGLE_CONNECT_CLIENT_SECRET = 'Cql8UQrWMCSgPJwVGuNNOTPJ';

    sails.GITHUB_CONNECT_CLIENT_ID = '24c9189de792ff083814';
    sails.GITHUB_CONNECT_CLIENT_SECRET = '5c0ec92f7cbbdf3fac78d68cb6aef51b8803ce24';

    sails.TWITTER_OAUTH_CLIENT_ID = 'Hv7SUemRQ3vrIwZJ7Df66A';
    sails.TWITTER_OAUTH_CLIENT_SECRET = 'FXj77nFhLydfiHoV2dem90kEnAz2T2yDT9BE70bNl88';
}



// Start Server
sails.lift(require('optimist').argv);
