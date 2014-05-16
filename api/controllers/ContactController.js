var sails = require('sails');
var Parse = require('parse').Parse;
var https = require('https');
var twitterAPI = require('node-twitter-api');

var Firebase = require('firebase');
var FirebaseTokenGenerator = require("firebase-token-generator");

var tokenGenerator = new FirebaseTokenGenerator("EyziaFZwrpPxf8GoUOPsci9u6DCZhVzRhCjJX9VZ");
var AUTH_TOKEN = tokenGenerator.createToken({some: "arbitrary", data: "here"});

serverRootRef = new Firebase("https://koalalab-berry.firebaseio.com/"); // this is the global Firebase object
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

      var query = new Parse.Query("Account");
      query.equalTo("provider", "facebook");
      query.equalTo("user", this);
      query.find({
        success: function(accounts) {

          if (accounts.length === 0) {
            return res.json({"code":401,"message":"Not authorized"}, 401);
          }

          console.log("Social account linkage found");

          // retrieve accessToken from user
          var accessToken = accounts[0].get("accessToken");
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
              var friendList = JSON.parse(buffer);
              friendList = friendList.data;

              console.log("friendlist ", friendList);
              var contacts = [];
              
              if (friendList) {
                for (var i = 0; i < friendList.length; i++) {
                  var tmp = {
                    provider: "facebook",
                    id: friendList[i].id,
                    name: friendList[i].name,
                    avatar: 'http://graph.facebook.com/' + friendList[i].id + '/picture',
                    username: friendList[i].username
                  };
                  contacts.push(tmp);
                }
              }
              done(contacts);
            });
          });

          request.on('error', function(e){
            console.log('error from getData: ' + e.message)
          });

          request.end();
        },
        error: function(error) {
          return res.json({
            status: 401
          }, 401);
        }
      });
    };

    user.importGoogleContacts = function(done) {
      console.log("importGoogleContacts()");

      var self = this;

      var query = new Parse.Query("Account");
      query.equalTo("provider", "google");
      query.equalTo("user", this);
      query.find({
        success: function(accounts) {

          if (accounts.length === 0) {
            return res.json({"code":401,"message":"Not authorized"}, 401);
          }

          console.log("Social account linkage found");

          // retrieve accessToken from user
          var accessToken = accounts[0].get("accessToken");
          var apiPath = "/plus/v1/people/me/people/visible email";

          console.log(accessToken);

          var options = {
            host: 'www.googleapis.com',
            port: 443,
//            path: apiPath + '?key=AIzaSyAqPnCk3pwWgHCZS2FrgZFFGvdWBRU7er4', //apiPath example: '/me/friends'
            path: apiPath + '?access_token=' + accessToken,
            method: 'GET'
//            headers: {'Authorization':  'Bearer ' + accessToken}
          };

          var buffer = ''; //this buffer will be populated with the chunks of the data received from facebook
          var request = https.get(options, function(result){
//            console.log('HEADERS: ' + JSON.stringify(result.headers));
            result.setEncoding('utf8');
            result.on('data', function(chunk){
              console.log('chunk - ', chunk);
              buffer += chunk;
            });

            result.on('end', function(){

              var result = JSON.parse(buffer);

              if (result.error) {
                done(result);
              }

              var friendList = result.items;

              console.log("friendList ", friendList);

              var contacts = [];
              if (friendList) {
                for (var i = 0; i < friendList.length; i++) {
                  if (friendList[i].objectType === "person") {
                    var tmp = {
                      provider: "google",
                      id: friendList[i].id,
                      name: friendList[i].displayName,
                      avatar: friendList[i].image.url
                    };
                    contacts.push(tmp);
                  }
                }
              }
              done(contacts);
            });
          });

          request.on('error', function(e){
            console.log('error from getData: ' + e.message)
          });

          request.end();
        },
        error: function(error) {
          return res.json({
            status: 401
          }, 401);
        }
      });
    };

    user.importTwitterContacts = function(done) {
      console.log("importTwitterContacts()");

      var self = this;

      var query = new Parse.Query("Account");
      query.equalTo("provider", "twitter");
      query.equalTo("user", this);
      query.find({
        success: function(accounts) {

          if (accounts.length === 0) {
            return res.json({"code":401,"message":"Not authorized"}, 401);
          }

          console.log("Social account linkage found");

          // retrieve accessToken from user
          var accessToken = accounts[0].get("accessToken");
          var accessTokenSecret = accounts[0].get("refreshTokenOrTokenSecret");

          var twitter = new twitterAPI({
            consumerKey: sails.TWITTER_OAUTH_CLIENT_ID,
            consumerSecret: sails.TWITTER_OAUTH_CLIENT_SECRET
          });

          var params = {
            cursor : -1,
            skip_status : true,
            include_user_entities : false,
            count : 200
          };

          twitter.followers("list", params, accessToken, accessTokenSecret, function(error, data, response){
            if (error) {
              return res.json({
                status: 401
              }, 401);
            } else {
              var contacts = [];
              if (data) {
                console.log(data.users);
                for (var i = 0; i < data.users.length; i++) {
                  var tmp = {
                    provider: "twitter",
                    id: data.users[i].id_str,
                    name: data.users[i].name,
                    avatar: data.users[i].profile_image_url
                  };
                  contacts.push(tmp);
                }
              }
              console.log(contacts);
              done(contacts);
            }
          });
        },
        error: function(error) {
          return res.json({
            status: 401
          }, 401);
        }
      });
    };

    user.importGitHubContacts = function(done) {
      console.log("importGitHubContacts()");

      var self = this;

      var query = new Parse.Query("Account");
      query.equalTo("provider", "github");
      query.equalTo("user", this);
      query.find({
        success: function(accounts) {

          if (accounts.length === 0) {
            return res.json({"code":401,"message":"Not authorized"}, 401);
          }

          console.log("Social account linkage found");

          // retrieve accessToken from user
          var accessToken = accounts[0].get("accessToken");
          var apiPath = "/user/following";

          console.log(accessToken);

          var options = {
            host: 'api.github.com',
            port: 443,
//            path: apiPath + '?key=AIzaSyAqPnCk3pwWgHCZS2FrgZFFGvdWBRU7er4', //apiPath example: '/me/friends'
            path: apiPath + '?access_token=' + accessToken,
            method: 'GET',
            headers: {'User-Agent':  'beepe.me'}
          };

          var buffer = ''; //this buffer will be populated with the chunks of the data received from facebook
          var request = https.get(options, function(result){
//            console.log('HEADERS: ' + JSON.stringify(result.headers));
            result.setEncoding('utf8');
            result.on('data', function(chunk){
              console.log('chunk - ', chunk);
              buffer += chunk;
            });

            result.on('end', function(){

              var result = JSON.parse(buffer);

              if (result.error) {
                done(result);
              }

              var friendList = result;

              console.log("friendList ", friendList);

              var contacts = [];
              if (friendList) {
                for (var i = 0; i < friendList.length; i++) {
                  if (friendList[i].type === "User") {
                    var tmp = {
                      provider: "github",
                      id: friendList[i].id,
                      name: friendList[i].login,
                      avatar: friendList[i].avatar_url
                    };
                    contacts.push(tmp);
                  }
                }
              }
              done(contacts);
            });
          });

          request.on('error', function(e){
            console.log('error from getData: ' + e.message)
          });

          request.end();
        },
        error: function(error) {
          return res.json({
            status: 401
          }, 401);
        }
      });
    };

    user.importLinkedInContacts = function(done) {
      console.log("importLinkedInContacts()");

      var self = this;

      var query = new Parse.Query("Account");
      query.equalTo("provider", "linkedin");
      query.equalTo("user", this);
      query.find({
        success: function(accounts) {

          if (accounts.length === 0) {
            return res.json({"code":401,"message":"Not authorized"}, 401);
          }

          console.log("Social account linkage found");

          // retrieve accessToken from user
          var accessToken = accounts[0].get("accessToken");
          var apiPath = "/v1/people/~/connections:(id,formatted-name,headline,picture-url)";

          console.log(accessToken);

          var options = {
            host: 'api.linkedin.com',
            port: 443,
//            path: apiPath + '?key=AIzaSyAqPnCk3pwWgHCZS2FrgZFFGvdWBRU7er4', //apiPath example: '/me/friends'
            path: apiPath + '?format=json&oauth2_access_token=' + accessToken,
            method: 'GET',
            headers: {'User-Agent':  'beepe.me'}
          };

          var buffer = ''; //this buffer will be populated with the chunks of the data received from facebook
          var request = https.get(options, function(result){
//            console.log('HEADERS: ' + JSON.stringify(result.headers));
            result.setEncoding('utf8');
            result.on('data', function(chunk){
              console.log('chunk - ', chunk);
              buffer += chunk;
            });

            result.on('end', function(){

              var result = JSON.parse(buffer);

              if (result.error) {
                done(result);
              }

              var friendList = result.values;

              console.log("friendList ", friendList);

              var contacts = [];
              if (friendList) {
                for (var i = 0; i < friendList.length; i++) {
                  console.log(friendList[i]);
                  var tmp = {
                    provider: "linkedin",
                    id: friendList[i].id,
                    name: friendList[i].formattedName,
                    avatar: friendList[i].pictureUrl
                  };
                  contacts.push(tmp);
                }
              }
              console.log('contacts', contacts);
              done(contacts);
            });
          });

          request.on('error', function(e){
            console.log('error from getData: ' + e.message)
          });

          request.end();
        },
        error: function(error) {
          return res.json({
            status: 401
          }, 401);
        }
      });
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
    } else if (source === "twitter") {
      user.importTwitterContacts(function(json) {
        return res.json(json);
      });
    } else if (source === "github") {
      user.importGitHubContacts(function(json) {
        return res.json(json);
      });
    } else if (source === "linkedin") {
      user.importLinkedInContacts(function(json) {
        return res.json(json);
      });
//    } else if (source === "linkedin") {
//      user.importLinkedInContacts(function(json) {
//        return res.json(json);
//      });
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
