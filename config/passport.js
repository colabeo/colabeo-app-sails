var sails = require('sails');
var express = require('express');
var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    GitHubStrategy = require('passport-github').Strategy,
    TwitterStrategy = require('passport-twitter').Strategy,
    LinkedInStrategy = require('passport-linkedin-oauth2').Strategy,
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
        success: function (user) {
            done(null, user);
        },
        error: function (object, error) {
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
                    var message = sails.verifyEmailText;
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

var sails = require("sails");

var FACEBOOK_APP_ID = sails.FACEBOOK_APP_ID;
var FACEBOOK_APP_SECRET = sails.FACEBOOK_APP_SECRET;
var HOST_SERVER_URL = sails.HOST_SERVER_URL;

console.log("FACEBOOK ID + SECRET " + FACEBOOK_APP_ID + ", " + FACEBOOK_APP_SECRET);

var socialAccountAuthenticationHandler = function (req, user, accessToken, provider, externalId, done) {
    process.nextTick(function () {

        // Get the user from a non-authenticated method
        var query = new Parse.Query(Parse.User);
        console.log("Query user - ", user);
        query.equalTo("username", user.get("username"));
        query.find({
            success: function (users) {
                if (users.length > 0) {
                    // if user already signup (email/username is found), create the social account linkage only.
                    console.log("existing user - ", users[0]);

                    var accountQuery = new Parse.Query("Account");
                    accountQuery.equalTo("user", users[0]);
                    accountQuery.equalTo("provider", provider);
                    accountQuery.equalTo("externalId", externalId);
                    accountQuery.find({
                        success: function (accounts) {
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
                        error: function (error) {
                            console.log("Find account error?", error);
                            return done(null, users[0]);
                        }
                    });
                } else {
                    console.log("new user - sign up");

                    user.signUp(null, {
                        success: function (savedUser) {
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
                        error: function (errorUser, error) {
                            // Show the error message somewhere and let the user try again.
                            // alert("Error: " + error.code + " " + error.message);
                            console.log("Sign up with provider - error", error.message);
                            req.flash('error', error.message);
                            return done(null, false, error.message);
                        }
                    });
                }
            },
            error: function (error) {
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
            success: function (accounts) {
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
            error: function (error) {
                console.log("Find account error?", error);
                return done(null, req.user);
            }
        });
    }
));

var GOOGLE_AUTH_CLIENT_ID = sails.GOOGLE_AUTH_CLIENT_ID;
var GOOGLE_AUTH_CLIENT_SECRET = sails.GOOGLE_AUTH_CLIENT_SECRET;

passport.use(new GoogleStrategy({
        clientID: GOOGLE_AUTH_CLIENT_ID,
        clientSecret: GOOGLE_AUTH_CLIENT_SECRET,
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

var GOOGLE_CONNECT_CLIENT_ID = sails.GOOGLE_CONNECT_CLIENT_ID;
var GOOGLE_CONNECT_CLIENT_SECRET = sails.GOOGLE_CONNECT_CLIENT_SECRET;

passport.use("google-connect", new GoogleStrategy({
        clientID: GOOGLE_CONNECT_CLIENT_ID,
        clientSecret: GOOGLE_CONNECT_CLIENT_SECRET,
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
            success: function (accounts) {
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
            error: function (error) {
                console.log("Find account error?", error);
                return done(null, req.user);
            }
        });

    }
));

var GITHUB_CONNECT_CLIENT_ID = sails.GITHUB_CONNECT_CLIENT_ID;
var GITHUB_CONNECT_CLIENT_SECRET = sails.GITHUB_CONNECT_CLIENT_SECRET;

passport.use("github-connect", new GitHubStrategy({
    clientID: GITHUB_CONNECT_CLIENT_ID,
    clientSecret: GITHUB_CONNECT_CLIENT_SECRET,
    callbackURL: HOST_SERVER_URL + "/connect/github/callback",
    passReqToCallback: true
  },
  function (req, accessToken, refreshToken, profile, done) {

    console.log("profile", profile);
    //TODO: change the expiration date

    console.log("github-connect - ", req);
    console.log("req.user - ", req.user);

    var query = new Parse.Query("Account");
    query.equalTo("user", req.user);
    query.equalTo("provider", "github");
    query.equalTo("externalId", profile._json.id.toString());
    query.find({
      success: function (accounts) {
        if (accounts.length === 0) {
          console.log("No social account linkage found ");
          // Create social account linkage
          var Account = Parse.Object.extend("Account");
          var account = new Account();
          account.set("provider", "github");
          account.set("externalId", profile._json.id.toString());
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
      error: function (error) {
        console.log("Find account error?", error);
        return done(null, req.user);
      }
    });

  }
));

passport.use("twitter-connect", new TwitterStrategy({
    consumerKey: sails.TWITTER_OAUTH_CLIENT_ID,
    consumerSecret: sails.TWITTER_OAUTH_CLIENT_SECRET,
    callbackURL: HOST_SERVER_URL + "/connect/twitter/callback",
    passReqToCallback: true
  },
  function (req, accessToken, tokenSecret, profile, done) {

    console.log("profile", profile);
    //TODO: change the expiration date
    console.log("req.user - ", req.user);

    var query = new Parse.Query("Account");
    query.equalTo("user", req.user);
    query.equalTo("provider", "twitter");
    query.equalTo("externalId", profile._json.id_str);
    query.find({
      success: function (accounts) {
        if (accounts.length === 0) {
          console.log("No social account linkage found ");
          console.log(profile._json.id_str);
          console.log("accessToken", accessToken);
          console.log("tokenSecret", tokenSecret);
          // Create social account linkage

          var Account = Parse.Object.extend("Account");
          var account = new Account();
          account.set("provider", "twitter");
          account.set("externalId", profile._json.id_str);
          account.set("accessToken", accessToken);
          account.set("refreshTokenOrTokenSecret", tokenSecret);
          account.set("user", req.user);
          account.save({
            success: function (account) {
              console.log("Social account linkage saved", account);
              return(null, req.user);
            },
            error: function (error) {
              console.log("Social account linkage save error", error);
              return(null, req.user);
            }
          });
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
      error: function (error) {
        console.log("Find account error?", error);
        return done(null, req.user);
      }
    });

  }
));

passport.use("linkedin-connect", new LinkedInStrategy({
    clientID:     '752pn0inx89p1l',
    clientSecret: 'AJu3dlUwErZuUU4z',
    callbackURL:  HOST_SERVER_URL + "/connect/linkedin/callback",
    scope:        [ 'r_basicprofile', 'r_emailaddress', 'r_network'],
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    req.session.accessToken = accessToken;
    process.nextTick(function () {
      console.log("profile", profile);
      //TODO: change the expiration date
      console.log("req.user - ", req.user);

      var query = new Parse.Query("Account");
      query.equalTo("user", req.user);
      query.equalTo("provider", "linkedin");
      query.equalTo("externalId", profile._json.id);
      query.find({
        success: function (accounts) {
          if (accounts.length === 0) {
            console.log("No social account linkage found ");
            console.log(profile._json.id_str);
            console.log("accessToken", accessToken);
            // Create social account linkage

            var Account = Parse.Object.extend("Account");
            var account = new Account();
            account.set("provider", "linkedin");
            account.set("externalId", profile._json.id);
            account.set("accessToken", accessToken);
            account.set("refreshTokenOrTokenSecret", refreshToken);
            account.set("user", req.user);
            account.save({
              success: function (account) {
                console.log("Social account linkage saved", account);
                return(null, req.user);
              },
              error: function (error) {
                console.log("Social account linkage save error", error);
                return(null, req.user);
              }
            });
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
        error: function (error) {
          console.log("Find account error?", error);
          return done(null, req.user);
        }
      });
    });
  }
));

passport.use(new LinkedInStrategy({
    clientID:     '75iszqab0ero2u',
    clientSecret: 'EuG8oSzfy0BNtO8r',
    callbackURL:  HOST_SERVER_URL + "/connect/linkedin/callback",
    scope:        [ 'r_basicprofile', 'r_emailaddress'],
    passReqToCallback: true
  }, function(req, accessToken, refreshToken, profile, done) {

    process.nextTick(function () {
      console.log("in process", profile);
      // To keep the example simple, the user's Google profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Google account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });

    console.log("profile", profile);
    //TODO: change the expiration date

    console.log("linkedin-connect - ", req);
    console.log("req.user - ", req.user);

    var query = new Parse.Query("Account");
    query.equalTo("user", req.user);
    query.equalTo("provider", "linkedin");
    query.equalTo("externalId", profile._json.id.toString());
    query.find({
      success: function (accounts) {
        if (accounts.length === 0) {
          console.log("No social account linkage found ");
          // Create social account linkage
          var Account = Parse.Object.extend("Account");
          var account = new Account();
          account.set("provider", "linkedin");
          account.set("externalId", profile._json.id.toString());
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
      error: function (error) {
        console.log("Find account error?", error);
        return done(null, req.user);
      }
    });
  }
));

module.exports = {

    express: {

        customMiddleware: function (app) {

            console.log('express middleware for passport');

            app.use(express.static(require('path').resolve(__dirname + "/../assets")));
            app.use(passport.initialize());
            app.use(passport.session());
            app.use(flash());
        }

    }

};
