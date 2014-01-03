var passport    = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
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
var FACEBOOK_APP_ID = '1428317197384013';
var FACEBOOK_APP_SECRET = 'd03fd6db99a7b1c5dd0d82b6d61126ca';
var HOST_SERVER_URL = 'http://localhost:1337';

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

    //TODO: use generated GUID as the password
    var user = new Parse.User();
    var password = "abcd1234";
    var username = profile.provider + ":" + profile._json.id;
    user.set("lastname", profile._json.last_name);
    user.set("firstname", profile._json.first_name);
    user.set("username", username);
    user.set("password", password);
    user.set("authData", authData);

    user.signUp(null, {
      success: function(savedUser) {
        console.log("Sign up with facebook - success");
        console.log("User  - ", username, password);
        Parse.User.logIn(username, password, {

          success: function (loggedInUser) {
            console.log("Logged In with sign up with facebook - success")
            return done(null, loggedInUser);
          },

          error: function (errorUser, error) {
            console.log("login after sign up with facebook - error" + JSON.stringify(error));
            return done(null, false, error.message);
          }

        });
      },
      error: function(errorUser, error) {
        // Show the error message somewhere and let the user try again.
        // alert("Error: " + error.code + " " + error.message);
        console.log("Sign up with facebook - error", error.message);
        req.flash('error', error.message);
        done(null, false, error.message);
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