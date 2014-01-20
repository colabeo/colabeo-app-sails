var Parse = require('parse').Parse;
var https = require('https');

var Firebase = require('firebase');
var FirebaseTokenGenerator = require("firebase-token-generator");

var FIREBASE_URL = 'https://koalalab-berry.firebaseio.com/';
var YOUR_FIREBASE_SECRET = 'EyziaFZwrpPxf8GoUOPsci9u6DCZhVzRhCjJX9VZ';

var tokenGenerator = new FirebaseTokenGenerator(YOUR_FIREBASE_SECRET);
var AUTH_TOKEN = tokenGenerator.createToken({some: "arbitrary", data: "here"});

serverRootRef = new Firebase(FIREBASE_URL); // this is the global Firebase object
// Log me in
serverRootRef.auth(AUTH_TOKEN, function(error) {
  if(error) {
    console.log("Firebase Login Failed!", error);
  } else {
    console.log("Firebase Login Success!");
  }
});

var sendInviteEmail = function(user, newContact, done) {
  var subject = user.get("firstname") + " has just invited you to chat with Colabeo";
  var text = "Hi " + newContact.firstname + ",\n\n" + user.get("firstname") + " has just invited you to use Colabeo. Please click on this link to add Colabeo extension to your chrome browser: www.colabeo.com/install.html Talk to you soon!";
  var to = newContact.email;
  var from = user.get("email");
  sendEmail(to,from,subject,text,done);
};

var sendContactNotification = function(user, newContact, done) {
  var subject = user.get("firstname") + " has just added you their contact list. Start calling today!"
  var text = "Hi " + newContact.firstname + ",\n\n" + user.get("firstname") + " has just added you to their Colabeo contact list. Open your browser and call them back."
  var to = newContact.email;
  var from = user.get("email");
  sendEmail(to,from,subject,text,done);
};

var sendEmail = function(to, from, subject, text, done) {
  var API_USERNAME = "chapman";
  var API_PASSWORD = "qwerty23";

  var sendgrid  = require('sendgrid')(API_USERNAME, API_PASSWORD);

  var smtpapiHeaders = new sendgrid.SmtpapiHeaders();
  smtpapiHeaders.addFilterSetting('subscriptiontrack', 'enable', '0');
  sendgrid.send({
    smtpapi: smtpapiHeaders,
    to:       to,
    from:     from,
    subject:  subject,
    text : text
  }, function(err, json) {
    if (err) {
      console.error(err);
      done({ message : "error" });
    }
    else {
      console.log(json);
      done(json);
    }
  });
};

/**
 * ContactController
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
    
  add : function(req, res, next) {
    var newContact = {
      email : this.param("email"),
      socialProfileType : this.param("socialProfileType"),
      socialProfileId : this.param("socialProfileId"),
      firstname : this.param("firstName"),
      lastname : this.param("lastName")
    };

    var user = req.user;

    user.initFirebaseRef = function(uid, serverRootRef) {
      var self=this;
      this.fireBaseRef = serverRootRef.child('users').child(uid);
      this.fireBaseIndexRef=serverRootRef.child('index');
      this.fireBaseContactRef=this.fireBaseRef.child('contacts');
      this.fireBaseRef.child('email').once('value', function(snapshot) {
        if (snapshot.val()==null || snapshot.val()=='unknown')
        {
          if (self.attributes.email)
          {
            console.log('Init user FirebaseRef, email=' + self.attributes.email)
            self.fireBaseRef.update({email: self.attributes.email});
          }
          else
          {
            console.log('Init user FirebaseRef, email=unknown')
            self.fireBaseRef.update({email: 'unknown'});
          }
        }
      });
    };

    user.importContactByEmail = function(newContact, done) {
      var self = this;
      this.fireBaseContactRef.once('value', function (snapshot) {
        var contactList = snapshot.val();
        var conflict = false;
        for (var id in contactList) {
          console.log("contact in contactList" + JSON.stringify(id));
          if (contactList[id].email == newContact.email) {
            conflict = true;
          }
        }

        if (!conflict) {
          console.log("new Contact" + JSON.stringify(newContact));
          self.fireBaseContactRef.push(newContact, function () {
            console.log('contact added!');
            var query = new Parse.Query(Parse.User);
            query.equalTo( "email", newContact.email);  // find all the same user
            query.first({
              success: function(results) {
                //console.log("Results" + JSON.stringify(results));
                if ( results == undefined )  {
                  sendInviteEmail(user, newContact, function(json) {
                    done(json);
                  });
                }
                else {
                  sendContactNotification(user, newContact, function(json) {
                    done(json);
                  });
                }
              }
            }); //End Query.first
          });
        } else {

        }
      });
    };

    var self = this;

    user.initFirebaseRef(user.id, serverRootRef);
    user.importContactByEmail(newContact, function(json) {
      return res.json(json);
    });
  },

  getAll: function(req, res, next) {

    var source = req.param("source");
    var user = req.user;

    user.initFirebaseRef = function(uid, serverRootRef) {
      var self=this;
      this.fireBaseRef = serverRootRef.child('users').child(uid);
      this.fireBaseIndexRef=serverRootRef.child('index');
      this.fireBaseContactRef=this.fireBaseRef.child('contacts');
      this.fireBaseRef.child('email').once('value', function(snapshot) {
        if (snapshot.val()==null || snapshot.val()=='unknown')
        {
          if (self.attributes.email)
          {
            console.log('Init user FirebaseRef, email=' + self.attributes.email)
            self.fireBaseRef.update({email: self.attributes.email});
          }
          else
          {
            console.log('Init user FirebaseRef, email=unknown')
            self.fireBaseRef.update({email: 'unknown'});
          }
        }
      });
    };

    user.importFacebookContacts = function(done) {

      console.log("importFacebookContacts()");

      var self = this;

      console.log("authData ", this.get("authData"));

      // retrieve accessToken from user
      var accessToken = this.get("authData").facebook.access_token;
      var apiPath = "/me/friends";

      console.log(accessToken);

      var options = {
        host: 'graph.facebook.com',
        port: 443,
        path: apiPath + '?access_token=' + accessToken, //apiPath example: '/me/friends'
        method: 'GET'
      };

      var buffer = ''; //this buffer will be populated with the chunks of the data received from facebook
      var request = https.get(options, function(result){
        result.setEncoding('utf8');
        result.on('data', function(chunk){
          buffer += chunk;
        });

        result.on('end', function(){
          var friendlist = JSON.parse(buffer);
          friendlist = friendlist.data;

          var contacts = [];
          for (var i = 0; i < friendlist.length; i++) {
            var tmp = {
              handle: {
                facebook: friendlist[i].id
              },
              id: friendlist[i].name,
              avatar: 'http://graph.facebook.com/' + friendlist[i].id + '/picture'
            };

            contacts.push(tmp);
          }
          done(contacts);
        });
      });

      request.on('error', function(e){
        console.log('error from getData: ' + e.message)
      });

      request.end();
    };

    user.importGoogleContacts = function(done) {

    };

    user.initFirebaseRef(user.id, serverRootRef);

    if (source === "facebook") {
      user.importFacebookContacts(function(json) {
        console.log("facebook contacts", json);
        return res.json(json);
      });
    } else if (source === "google") {
      user.importGoogleContacts(function(json) {
        return res.json(json);
      });
    } else {
      console.log("Source is not valid. Something wrong");
      next();
    }


  },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to ContactController)
   */
  _config: {}

  
};
