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

  signUp : function() {

  },

  login : function(req, res, next) {

    console.log("called.");

    passport.authenticate('local', {
//            successRedirect: '/',
//            failureRedirect: this.urlFor({ action: 'login' }),
        failureFlash: true
      }, function(err, user, info) {
      console.log("after login ", user);
      console.log("req.isAuthenticated() ", req.isAuthenticated());
//      console.log("next ", next);
      console.log("err ", err);
      console.log("info ", info);

      if (err) { return next(err); }
      if (!user) { return res.redirect('/login'); }

      req.logIn(user, function(err) {
        if (err) { return next(err); }
        console.log("user ", user);
        console.log("RememberMe ", req.body.RememberMe);
        if ((user) && (req.body.RememberMe)) {
          res.cookie('_sessionToken', user._sessionToken, {expires: new Date(Date.now() + COOKIE_LIFECYCLE), httpOnly: true});
        }
        return res.redirect('/');
      })
    }
    )(req, res, next);
  }

};
