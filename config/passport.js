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

var FACEBOOK_APP_ID = '1428317197384013';
var FACEBOOK_APP_SECRET = 'd03fd6db99a7b1c5dd0d82b6d61126ca';
var HOST_SERVER_URL = 'localhost:1337';

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: HOST_SERVER_URL + "/auth/facebook/callback",
    passReqToCallback: true
  },
  function (req, facebookAccessToken, refreshToken, profile, done) {
    console.log('@FacebookStrategy - After login, AccessToken=' + facebookAccessToken);
    delete profile._raw;
    delete profile._json;
    profile.token=facebookAccessToken;

    var account_current=req.session.passport.user;
    if (!account_current)
      account_current={};
    account_current.facebook = profile  // Add profile to session

    var user_current=userPool[account_current.uid];
    if (user_current && account_current.uid)   // User exists, client has already login with at least one social network,
    {
      user_current.addSocialNetwork(profile); // Add Social Network profile & connector to User instance.
      user_current._updateFireBaseIndex(profile.provider, profile.id);
      account_current.uid = user_current.uid;
      console.log('@FacebookStrategy - Add facebook profile to User.');
      console.log(user_current);
      done(null, account_current);
    }
    else
    {
      User.findOrCreate(profile.id, 'facebook', serverRootRef, facebookAccessToken, profile, function (userInstance) {
        user_current = userInstance;
        account_current.uid = user_current.uid;
        // Just in case client close browser and re-open(without Remember Me checked), then cleaning up, delete the previous user.
        var user_previous = userPool[account_current.uid];
        if (user_previous)
          delete user_previous;
        userPool[account_current.uid] = user_current;
        console.log('@FacebookStrategy - Create User with facebook profile.');
//                console.log(user_current);
        done(null, account_current);
      });
    }
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