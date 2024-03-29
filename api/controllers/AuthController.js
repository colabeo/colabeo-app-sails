/**
 * AuthController
 *
 * @module      :: Controller
 * @description	:: A set of functions called `actions`.
 *
 *                 Actions contain code telling Sails how to respond to a certain type of request.
 *                 (i.e. do stuff, then send some JSON, show an HTML page, or redirect to another URL)
 *
 *                 You can configure the blueprint URLs which trigger these actions (`config/controllers.js`)
 *                 and/or override them with custom routes (`config/routes.js`)
 *
 *                 NOTE: The code you write here supports both HTTP and Socket.io automatically.
 *
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */
var sails = require('sails');
var passport = require('passport');
var Parse = require('parse').Parse;

module.exports = {

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to AuthController)
   */
  _config: {},

  signUp : function(req, res, next) {

    var user = new Parse.User();
    user.set("lastname", req.param('lastname'));
    user.set("firstname", req.param('firstname'));
    user.set("username", req.param('email'));
    user.set("password", req.param('password'));
    user.set("email", req.param('email'));

    user.signUp(null, {
      success: function(user) {
        console.log("Sign up - success");
        req.flash('error', sails.verifyEmailText);
        res.redirect('/');
      },
      error: function(user, error) {
        // Show the error message somewhere and let the user try again.
        // alert("Error: " + error.code + " " + error.message);
        req.flash('error', error.message);
        res.redirect('/register');
      }
    });

  },

  forgetPassword : function(req, res, next) {
    console.log("forget Password calling " + req.param('email'));

    Parse.User.requestPasswordReset(req.param("email"), {
      success: function() {
        // Password reset request was sent successfully
        res.redirect('/');
      },
      error: function(error) {
        // Show the error message somewhere
        // alert("Error: " + error.code + " " + error.message);
      }
    });
  },

  login : function(req, res, next) {

    passport.authenticate('local', {
//            successRedirect: '/',
//            failureRedirect: this.urlFor({ action: 'login' }),
        failureFlash: true
      }, function(err, user, info) {
//        console.log("after login ", user);
//        console.log("req.isAuthenticated() ", req.isAuthenticated());
////      console.log("next ", next);
//        console.log("err ", err);
//        console.log("info ", info);
        req.flash('error', info=='invalid login parameters' ? sails.loginErrorText : info);

        if (err) { return next(err); }
        if (!user) { return res.redirect('/login'); }

        req.logIn(user, function(err) {
          if (err) { return next(err); }
//          console.log("user ", user);
//          console.log("RememberMe ", req.body.RememberMe);
          if ((user) && (req.body.RememberMe)) {
            res.cookie('_sessionToken', user._sessionToken, {expires: new Date(Date.now() + sails.COOKIE_LIFECYCLE), httpOnly: true});
          }
          return res.redirect('/');
        })
      }
    )(req, res, next);
  },

  loginWith : function(req, res, next) {
    var provider = req.param("provider");
    console.log("loginWith ", provider);

    var scope = req.param("scope");
    if (scope) {
      console.log(decodeURIComponent(scope));
      passport.authenticate(provider, { failureRedirect: '/login' , scope : decodeURIComponent(scope) })(req, res, next);
    } else {
      console.log("loginWith no scope");
      passport.authenticate(provider, { state : '', failureRedirect: '/login' })(req, res, next);
    }
  },

  loginWithCallback : function(req, res, next) {
    var provider = req.param("provider");
    console.log("loginWithCallback ", provider);

    passport.authenticate(provider, {
        failureFlash: true
      }, function(err, user, info) {
//        console.log("after login ", user);
//        console.log("req.isAuthenticated() ", req.isAuthenticated());
//        console.log("err ", err);
//        console.log("info ", info);

        req.flash('error', info);

        if (err) { return next(err); }
        if (!user) { return res.redirect('/callback.html'); }

        req.logIn(user, function(err) {
          if (err) { return next(err); }
//          console.log("user ", user);
//          console.log("RememberMe ", req.body.RememberMe);
//          if ((user) && (req.body.RememberMe)) {
//            res.cookie('_sessionToken', user._sessionToken, {expires: new Date(Date.now() + sails.sCOOKIE_LIFECYCLE), httpOnly: true});
//          }
          return res.redirect('/callback.html');
        })
      }
    )(req, res, next);

  },

  logout : function(req, res, next) {
    if (req.isAuthenticated()) {
      Parse.User.become(req.user._sessionToken, function(user) {
        Parse.User.logOut();
        req.logout();
        res.clearCookie('_sessionToken');
        res.redirect('/');
      });
    } else {
      res.redirect('/');
    }
  },

  connectWith : function(req, res, next) {
    var provider = req.param("provider");
    console.log("connectWith", provider);

    if (provider === "linkedin") {
      passport.authorize('linkedin-connect', { state : 'SOME STATE' })(req, res, next);
    } else {
      var scope = req.param("scope");
      if (scope) {
        console.log(decodeURIComponent(scope));
        passport.authorize(provider + '-connect', { failureRedirect: '/' , scope : decodeURIComponent(scope) })(req, res, next);
      } else {
        console.log("connectWith", provider);
        passport.authorize(provider + '-connect', { failureRedirect: '/' })(req, res, next);
      }
    }
  },

  connectWithCallback: function(req, res, next) {
    var provider = req.param("provider");
    console.log("connectWithCallback", provider + "-connect")
    passport.authorize(provider + "-connect", {
        failureRedirect: '/callback.html'
      },
        function(a, b) {
          console.log("a", a);
          console.log("b", b);
          console.log("after authorize", req.user);
//          return res.json({ status : provider + " connected" });
          return res.redirect('/callback.html');
        }
    )(req, res, next);
  },

  disconnectWith : function(req, res) {
    var provider = req.param("provider");
    console.log("dis-connectWith", provider);

    var accountQuery = new Parse.Query("Account");
    accountQuery.equalTo("user", req.user);
    accountQuery.equalTo("provider", provider);
    accountQuery.find({
      success: function(accounts) {
        if (accounts.length > 0) {
          for (var i=0; i<accounts.length;i++) {
            accounts[0].destroy();
        }
        }
        return res.redirect('/');
      },
      error: function(error) {
        return res.json(error);
      }
    });
  }
};
