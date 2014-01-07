var passport = require('passport');
var Parse = require('parse').Parse;

COOKIE_LIFECYCLE =  30 * 24 * 60 * 60 * 1000;   //1-month

/**
 * UserController
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

module.exports = {

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to UserController)
   */
  _config: {},

  registrationForm : function(req, res, next) {
    var message = req.flash('error');
    return res.view({ message : message });
  },

  loginForm : function(req, res, next) {
    var message = req.flash('error');
    console.log('login for message', message);

    //var scope = encodeURIComponent('["https://www.googleapis.com/auth/plus.login", "https://www.googleapis.com/auth/userinfo.profile"]');
    var scope = encodeURIComponent('profile email https://www.googleapis.com/auth/plus.login');
    console.log(scope);

    return res.view({ message : message, googlescope : scope });
  },

  forgetPasswordForm : function(req, res, next) {
    return res.view();
  },

//  signUp : function(req, res, next) {
//
//    var user = new Parse.User();
//    user.set("lastname", req.param('lastname'));
//    user.set("firstname", req.param('firstname'));
//    user.set("username", req.param('email'));
//    user.set("password", req.param('password'));
//    user.set("email", req.param('email'));
//
//    user.signUp(null, {
//      success: function(user) {
//        console.log("Sign up - success");
//        res.redirect('/');
//      },
//      error: function(user, error) {
//        // Show the error message somewhere and let the user try again.
//        // alert("Error: " + error.code + " " + error.message);
//        req.flash('error', error.message);
//        res.redirect('/register');
//      }
//    });
//
//  },
//
//  signUpWithFacebook : function(req, res, next) {
//
//  },
//
//  forgetPassword : function(req, res, next) {
//    console.log("forget Password calling " + req.param('email'));
//
//    Parse.User.requestPasswordReset(req.param("email"), {
//      success: function() {
//        // Password reset request was sent successfully
//        res.redirect('/');
//      },
//      error: function(error) {
//        // Show the error message somewhere
//        // alert("Error: " + error.code + " " + error.message);
//      }
//    });
//  },
//
//  login : function(req, res, next) {
//
//    passport.authenticate('local', {
////            successRedirect: '/',
////            failureRedirect: this.urlFor({ action: 'login' }),
//        failureFlash: true
//      }, function(err, user, info) {
//      console.log("after login ", user);
//      console.log("req.isAuthenticated() ", req.isAuthenticated());
////      console.log("next ", next);
//      console.log("err ", err);
//      console.log("info ", info);
//
//      req.flash('error', info);
//
//        if (err) { return next(err); }
//      if (!user) { return res.redirect('/login'); }
//
//      req.logIn(user, function(err) {
//        if (err) { return next(err); }
//        console.log("user ", user);
//        console.log("RememberMe ", req.body.RememberMe);
//        if ((user) && (req.body.RememberMe)) {
//          res.cookie('_sessionToken', user._sessionToken, {expires: new Date(Date.now() + COOKIE_LIFECYCLE), httpOnly: true});
//        }
//        return res.redirect('/');
//      })
//    }
//    )(req, res, next);
//  },

  me : function(req, res, next) {

    if (req.isAuthenticated()) {
//      console.log("me._sessionToken - ", req.user._sessionToken);
//      Parse.User.become(req.user._sessionToken, function(user){
//        return res.json(req.user);
//      });
      return res.json(req.user);
    }
    else {
      return res.json({ error : "User is not authenticated." });
    }

  },

  findUserByExternalAccount : function(req, res, next) {
    var provider = req.param('provider');
    var externalId = req.param('externalId');
//    console.log("External Account: ", provider, externalId);
    var query = new Parse.Query(Parse.User);

    if ((!provider) || (provider === 'email')) {
      query.equalTo("email", externalId);
      query.find({
        success: function(users) {
//          console.log("user - " + JSON.stringify(users[0]));
          return res.json({ callee :  users[0] });
        }
      });
    }
    else {
      // TODO: add other provider search here
    }
  }

//  loginWith : function(req, res, next) {
//    var provider = req.param("provider");
//    console.log("loginWith ", provider);
//    passport.authenticate(provider, { failureRedirect: '/login' })(req, res, next);
//  },
//
//  loginWithCallback : function(req, res, next) {
//    var provider = req.param("provider");
//    console.log("loginWithCallback ", provider);
//
//    passport.authenticate(provider, {
//        failureFlash: true
//      }, function(err, user, info) {
//        console.log("after login ", user);
//        console.log("req.isAuthenticated() ", req.isAuthenticated());
//        console.log("err ", err);
//        console.log("info ", info);
//
//        req.flash('error', info);
//
//        if (err) { return next(err); }
//        if (!user) { return res.redirect('/login'); }
//
//        req.logIn(user, function(err) {
//          if (err) { return next(err); }
////          console.log("user ", user);
////          console.log("RememberMe ", req.body.RememberMe);
////          if ((user) && (req.body.RememberMe)) {
////            res.cookie('_sessionToken', user._sessionToken, {expires: new Date(Date.now() + COOKIE_LIFECYCLE), httpOnly: true});
////          }
//          return res.redirect('/');
//        })
//      }
//    )(req, res, next);
//
//  }

};
