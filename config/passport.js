var passport    = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    Parse = require('parse').Parse,
    bcrypt = require('bcrypt'),
    flash = require('connect-flash');

// setup req.session.passport.user
passport.serializeUser(function (user, done) {
  console.log("serializeUser - ", user.id);
  done(null, user.id);
});

// repopulate req.user
passport.deserializeUser(function (userId, done) {
  console.log("deserializeUser - ", userId);
  var query = new Parse.Query(Parse.User);
  query.get(userId, {
    success: function(user) {
      done(null, user);
    },
    error: function(object, error) {
      console.log(error.message);
      done(null, false, error.message);
    }
  });
});

// Use the LocalStrategy within Passport.
passport.use(new LocalStrategy({
    //usernameField: 'email'
    passReqToCallback: true
  },
  function (req, email, password, done) {
    console.log("email - " + email);
    console.log("password - " + password);
    Parse.User.logIn(email, password, {

      success: function (user) {
        if (user.get("emailVerified"))
          return done(null, user);
        else {
          var message = "email is not verified.";
          return done(null, false, message);
        }
      },

      error: function (user, error) {
        console.log("login - error" + JSON.stringify(error));
        return done(null, false, error.message);
      }

    });
  }
));

// TODO: Put these into the config file
var os = require("os");
var hoststring = os.hostname();

if ( hoststring.match("local") )  {
    var FACEBOOK_APP_ID = '1428317197384013';
    var FACEBOOK_APP_SECRET = 'd03fd6db99a7b1c5dd0d82b6d61126ca';
    var HOST_SERVER_URL = 'http://localhost:1337';
} //Development Facebook
else {
    var FACEBOOK_APP_ID = '686271008083898';
    var FACEBOOK_APP_SECRET = '6cbe30c8c9655e28f3a148876a819565';
    var HOST_SERVER_URL = 'https://dashboard.colabeo.com';
} //Production Facebook

console.log("FACEBOOK ID + SECRET " + FACEBOOK_APP_ID + ", " + FACEBOOK_APP_SECRET );

var socialAccountAuthenticationHandler = function (req, user, accessToken, provider, externalId, done) {
  process.nextTick(function () {

    // Get the user from a non-authenticated method
    var query = new Parse.Query(Parse.User);
    console.log("Query user - ", user);
    query.equalTo("username", user.get("username"));
    query.find({
      success: function(users) {
        if (users.length > 0) {
          // if user already signup (email/username is found), create the social account linkage only.
          console.log("existing user - ", users[0]);

          var accountQuery = new Parse.Query("Account");
          accountQuery.equalTo("user", users[0]);
          accountQuery.equalTo("provider", provider);
          accountQuery.equalTo("externalId", externalId);
          accountQuery.find({
            success: function(accounts) {
              if (accounts.length === 0) {
                console.log("No social account linkage found ");
                // Create social account linkage
                var Account = Parse.Object.extend("Account");
                var account = new Account();
                account.set("provider", provider);
                account.set("externalId", externalId);
                account.set("accessToken", accessToken);
                account.set("user", users[0]);
                account.save();
                return done(null, users[0]);
              }
              else {
                console.log("Social account linkage found");
                // Update the accessToken
                var account = accounts[0];
                account.set("accessToken", accessToken);
                account.save();
                return done(null, users[0]);
              }
            },
            error: function(error) {
              console.log("Find account error?", error);
              return done(null, users[0]);
            }
          });
        } else {
          console.log("new user - sign up");

          user.signUp(null, {
            success: function(savedUser) {
              console.log("Sign up  - success");

              // Create social account linkage
              var Account = Parse.Object.extend("Account");
              var account = new Account();
              account.set("provider", provider);
              account.set("externalId", externalId);
              account.set("accessToken", accessToken);
              account.set("user", savedUser);
              account.save();

              return done(null, savedUser);
            },
            error: function(errorUser, error) {
              // Show the error message somewhere and let the user try again.
              // alert("Error: " + error.code + " " + error.message);
              console.log("Sign up with provider - error", error.message);
              req.flash('error', error.message);
              return done(null, false, error.message);
            }
          });
        }
      },
      error: function(error) {
        console.log("find user error ", error);
        return done(null, false, error.message);
      }
    });

  });
};

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: HOST_SERVER_URL + "/auth/facebook/callback",
    passReqToCallback: true
  },
  function (req, facebookAccessToken, refreshToken, profile, done) {
    console.log('@FacebookStrategy - After login, AccessToken=' + facebookAccessToken);
    console.log('@FacebookStrategy - After login, refreshToken=' + refreshToken);
    console.log('provider - ', profile._raw);
    var provider = profile._raw;

    var user = new Parse.User();
    //TODO: use generated GUID (or we should use crypt username - in order to login) as the password
    var password = "abcd1234";
    //var username = profile.provider + ":" + profile._json.id;
    var username = profile._json.email;
    user.set("lastname", profile._json.last_name);
    user.set("firstname", profile._json.first_name);
    user.set("username", username);
    user.set("email", profile._json.email);
    user.set("password", password);

    socialAccountAuthenticationHandler(req, user, facebookAccessToken, "facebook", profile._json.id, done);

  }
));

passport.use("facebook-connect", new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: HOST_SERVER_URL + "/connect/facebook/callback",
    passReqToCallback: true
  },
  function (req, facebookAccessToken, refreshToken, profile, done) {

    console.log("profile", profile);
    //TODO: change the expiration date

    console.log("facebook-connect - ", req);
    console.log("req.user - ", req.user);

    // Create social account linkage

    var query = new Parse.Query("Account");
    query.equalTo("user", req.user);
    query.equalTo("provider", "facebook");
    query.equalTo("externalId", profile._json.id);
    query.find({
      success: function(accounts) {
        if (accounts.length === 0) {
          console.log("No social account linkage found ");
          // Create social account linkage
          var Account = Parse.Object.extend("Account");
          var account = new Account();
          account.set("provider", "facebook");
          account.set("externalId", profile._json.id);
          account.set("accessToken", facebookAccessToken);
          account.set("user", req.user);
          account.save();
          return done(null, req.user);
        }
        else {
          console.log("Social account linkage found");
          // Update the accessToken
          var account = accounts[0];
          account.set("accessToken", facebookAccessToken);
          account.save();
          return done(null, req.user);
        }
      },
      error: function(error) {
        console.log("Find account error?", error);
        return done(null, req.user);
      }
    });
  }
));

var GOOGLEPLUS_CLIENT_ID = '526862954475.apps.googleusercontent.com';
var GOOGLEPLUS_CLIENT_SECRET = 'r0wARG9mQuJxYFPGmYIzoYLH';
//var GOOGLEPLUS_CLIENT_ID = '406625335434.apps.googleusercontent.com';
//var GOOGLEPLUS_CLIENT_SECRET = 'AIzaSyAqPnCk3pwWgHCZS2FrgZFFGvdWBRU7er4';

passport.use(new GoogleStrategy({
    clientID: GOOGLEPLUS_CLIENT_ID,
    clientSecret: GOOGLEPLUS_CLIENT_SECRET,
    callbackURL: HOST_SERVER_URL + "/auth/google/callback",
    passReqToCallback: true
  },
  function (req, accessToken, refreshToken, profile, done) {
    console.log('@GoogleStrategy - After login, AccessToken=' + accessToken);
    console.log('@GoogleStrategy - After login, refreshToken=' + refreshToken);
    console.log('provider - ', profile._raw);

    var user = new Parse.User();
    //TODO: use generated GUID (or we should use crypt username - in order to login) as the password
    var password = "abcd1234";
    //var username = profile.provider + ":" + profile._json.id;
    var username = profile._json.email;
    user.set("lastname", profile._json.family_name);
    user.set("firstname", profile._json.given_name);
    user.set("username", username);
    user.set("email", profile._json.email);
    user.set("password", password);

    socialAccountAuthenticationHandler(req, user, accessToken, "google", profile._json.id, done);

  }))

if ( hoststring.match("local") )  {
  var GOOGLE_CONNECT_CLIENT_ID = '406625335434-009hdb2qpv8le0v2pn0kj631fjltnhkn.apps.googleusercontent.com';
  var GOOGLE_CONNECT_CLIENT_SERECT = 'FIH9T8rkXagBW8_UWOen4csA';
} //Development Facebook
else {
  var GOOGLE_CONNECT_CLIENT_ID = '';
  var GOOGLE_CONNECT_CLIENT_SERECT = '';
} //Production Facebook

passport.use("google-connect", new GoogleStrategy({
    clientID: GOOGLE_CONNECT_CLIENT_ID,
    clientSecret: GOOGLE_CONNECT_CLIENT_SERECT,
    callbackURL: HOST_SERVER_URL + "/connect/google/callback",
    passReqToCallback: true
  },
  function (req, accessToken, refreshToken, profile, done) {

    console.log("profile", profile);
    //TODO: change the expiration date

    console.log("google-connect - ", req);
    console.log("req.user - ", req.user);

    var query = new Parse.Query("Account");
    query.equalTo("user", req.user);
    query.equalTo("provider", "google");
    query.equalTo("externalId", profile._json.id);
    query.find({
      success: function(accounts) {
        if (accounts.length === 0) {
          console.log("No social account linkage found ");
          // Create social account linkage
          var Account = Parse.Object.extend("Account");
          var account = new Account();
          account.set("provider", "google");
          account.set("externalId", profile._json.id);
          account.set("accessToken", accessToken);
          account.set("user", req.user);
          account.save();
          return done(null, req.user);
        }
        else {
          console.log("Social account linkage found");
          // Update the accessToken
          var account = accounts[0];
          account.set("accessToken", accessToken);
          account.save();
          return done(null, req.user);
        }
      },
      error: function(error) {
        console.log("Find account error?", error);
        return done(null, req.user);
      }
    });

  }
));

module.exports = {

  express: {

    customMiddleware: function(app){

      console.log('express middleware for passport');

      app.use(passport.initialize());
      app.use(passport.session());
      app.use(flash());
    }

  }

};