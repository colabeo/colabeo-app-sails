var passport    = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    Parse = require('parse').Parse,
    bcrypt = require('bcrypt'),
    flash = require('connect-flash');

// setup req.session.passport.user
passport.serializeUser(function (user, done) {
  ///console.log("Serialize user ...");
  //var sessionUser = Utils.makeupSessionUser(user);
  //console.log(sessionUser);
  var sessionToken = user._sessionToken;
  done(null, sessionToken);
});

// repopulate req.user
passport.deserializeUser(function (sessionToken, done) {

  console.log("deserializeUser");

  if (sessionToken) {
    Parse.User.become(sessionToken, function(user) {
      done(null, user);
    });
  }
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

var socialAccountAuthenticationHandler = function (user, username, password, provider, externalId, done) {
  process.nextTick(function () {

    // Get the user from a non-authenticated method
    var query = new Parse.Query(Parse.User);
    console.log("Query user - ", user.get("username"));
    query.equalTo("username", user.get("username"));
    query.find({
      success: function(colabeoUser) {
        if (colabeoUser.length > 0) {
          console.log("colabeoUser - ", colabeoUser);
          Parse.User.logIn(username, password, {

            success: function (loggedInUser) {
              console.log("Logged In with sign up with provider - success");
              return done(null, loggedInUser);
            },
            error: function (errorUser, error) {
              console.log("login after sign up with provider - error" + JSON.stringify(error));
              return done(null, false, error.message);
            }

          });

        } else {
          console.log("new colabeo user - sign up");
          user.signUp(null, {
            success: function(savedUser) {
              console.log("Sign up  - success");
              console.log("User  - ", username, password);
              Parse.User.logIn(username, password, {

                success: function (loggedInUser) {
                  console.log("Logged In with sign up with provider - success");

                  // Create social account linkage
                  var Account = Parse.Object.extend("Account");
                  var account = new Account();
                  account.set("provider", provider);
                  account.set("externalId", externalId);
                  account.set("user", loggedInUser);
                  account.save();

                  console.log("Logged In with sign up with provider - success");
                  return done(null, loggedInUser);
                },

                error: function (errorUser, error) {
                  console.log("login after sign up with provider - error" + JSON.stringify(error));
                  return done(null, false, error.message);
                }

              });
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

    //TODO: change the expiration date
    var authData = {
      "facebook": {
        "id": provider.id,
        "access_token": facebookAccessToken,
        "expiration_date": "2014-02-01T10:10:00.000Z"
      }
    };

    //TODO: change the expiration date
//    var authData = {
//      "anonymous": {
//        "facebook" : {
//          "id": profile._json.id,
//          "access_token": facebookAccessToken
////        "expiration_date": "2014-02-01T10:10:00.000Z"
//        }
//      }
//    };

    var user = new Parse.User();
    //TODO: use generated GUID (or we should use crypt username - in order to login) as the password
    var password = "abcd1234";
    var username = profile.provider + ":" + profile._json.id;
    user.set("lastname", profile._json.last_name);
    user.set("firstname", profile._json.first_name);
    user.set("username", username);
    user.set("password", password);
    user.set("authData", authData);

    socialAccountAuthenticationHandler(user, username, password, "facebook", profile._json.id, done);

  }
));

passport.use("facebook-connect", new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: HOST_SERVER_URL + "/connect/facebook/callback",
    passReqToCallback: true
  },
  function (req, facebookAccessToken, refreshToken, profile, done) {

    console.log("profile", profile._json.id);
    //TODO: change the expiration date

    var fbAuthData =  {
      id: profile._json.id,
      access_token: facebookAccessToken,
      expiration_date: new Date(profile._json.expiresIn * 1000 +
        (new Date()).getTime()).toJSON()
    };

    var authData = req.user.get('authData') || {};
    authData["facebook"] = fbAuthData;
    req.user.set("authData", authData);
    console.log("authData", authData);

    req.user.save(null, {
      success: function(user) {
        console.log("link with provider - success");

        // Create social account linkage
        var Account = Parse.Object.extend("Account");
        var account = new Account();
        account.set("provider", "facebook");
        account.set("externalId", fbAuthData.id);
        account.set("user", user);
        account.save();

        console.log("lookup entry created - success");
        return done(null, user);
      },
      error: function(user, error) {
        console.log("save authData error", error);
        return done(error, user);
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

    var authData = {
      "anonymous": {
        "google" : {
          "id": profile._json.id,
          "access_token": accessToken
        }
      }
    };

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
    user.set("authData", authData);

    socialAccountAuthenticationHandler(user, username, password, "google", profile._json.id, done);

  }))

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