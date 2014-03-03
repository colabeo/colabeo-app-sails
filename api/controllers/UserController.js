var sails = require('sails');
var passport = require('passport');
var Parse = require('parse').Parse;
var https = require('https');

//TODO: Parameters for this function might need to change?
var emailChatRoom = function(caller, callee, emailflag, chatroom) {
    var from = caller.username; //Issues with facebook only accounts ?

    if(callee.provider == 'facebook') {

        var applicationId = '648143008577417';

        var options = {
          host: 'www.facebook.com',
          port: 443,
          path: '/dialog/send?app_id=' + applicationId + '&link=https://beepe.me/welcome?r=' + chatroom.id + '&to=' + callee.id + '&display=popup',
          method: 'GET'
        };

        var callback = function(res) {
            var data = "";
            res.on('error', function(e) {
                console.log(e.message);
            });
            res.on('data', function(chunk) {
                data += chunk;
            });
            res.on('end', function() {
              console.log("END ********** " + data);
              return res.json(chatroom);
            });
        };
        var req = http.request(options, callback);
        req.end();

        //TODO: example var link = https://www.facebook.com/dialog/send?app_id=648143008577417&link=https://beepe.me/welcome?r=asdfljkl&to=520918427&display=popup
        //TODO: the r = parameter is the chatroom.id and the to = paramater is facebook id callee.id
        //TODO: return res.json(chatroom and link) to jeff
    }
    else if (callee.provider == 'google') {
        //var to = callee.email;
        //TODO: return res.json(chatroom) for now until we figure what we need to for that
    }
    else {
        var to = callee.email;
        sendInvite(emailflag, to, from, caller, callee, chatroom);
        //TODO: return res.json(chatroom)
    }

};

var sendInvite = function(emailflag, to, from, caller, callee, chatroom) {
    switch(emailflag){
        case 1:
            console.log("Chatroom e-mail sent for emailflag set to 1");
            var subject = caller.firstname + " has invited you to a Beepe Chatroom";
            var text = "Hi " + callee.name + ",\n\n" + caller.firstname + " has just called you on Beepe\n\nClick on this link to start chatting:\n\nhttps://beepe.me/welcome?r="+chatroom;
            sendEmail(to, from, subject, text);
            break;
        case 2:
            console.log("Invite e-mail sent for emailflag set to 2");
            var subject = caller.firstname + " has invited you to use Beepe";
            var text = "Hi " + callee.name + ",\n\n" + caller.firstname + " has just called you on Beepe\n\nClick on this link to start using Beepe:\n\nhttp://beepe.me/";
            sendEmail(to, from, subject, text);
            break;
        case 3:
            console.log("Chatroom e-mail sent for emailflag set to 3");
            var subject = caller.firstname + " has invited you to a Beepe Chatroom";
            var text = "Email sent to: " + to + "\n\nHi " + callee.name + ",\n\n" + caller.firstname + " has just called you on Beepe\n\nClick on this link to start chatting:\n\nhttps://beepe.me/welcome?r="+chatroom;
            sendEmail("jeff@colabeo.com", from, subject, text);
            break;
        default:
            console.log("No email sent for emailflag set to " + emailflag);
    }
}

var sendEmail = function(to, from, subject, text) {
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
        }
        else {
            console.log(json);
            console.log("Sent to " + to);
        }
    });
};


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

    var facebookScope = encodeURIComponent('email');
    //var scope = encodeURIComponent('["https://www.googleapis.com/auth/plus.login", "https://www.googleapis.com/auth/userinfo.profile"]');
    var googleScope = encodeURIComponent('profile email https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/plus.me');
    console.log(googleScope);

    return res.view({ message : message, facebookscope : facebookScope, googlescope : googleScope });
  },

  forgetPasswordForm : function(req, res, next) {
    return res.view();
  },

  userManagement : function(req, res, next) {
    return res.view();
  },

  choosePassword : function(req, res, next) {
    return res.view();
  },

  emailVerification : function(req, res, next) {
    return res.view();
  },

  passwordUpdated : function(req, res, next) {
    return res.view();
  },

  welcome : function(req, res, next) {
    return res.view('user/welcome');
    //return res.view();
  },

  comingsoon : function(req, res, next) {
    return res.view('user/comingsoon');
    //return res.view();
  },

  call : function(req, res, next) {
    return res.view('user/famous_time');
  },

  me : function(req, res) {

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

  findUserByExternalAccount : function(req, res) {

    var provider = req.param('provider');
    var externalId = req.param('externalId');

    if ((!provider) || (provider === 'email')) {
      var query = new Parse.Query(Parse.User);
      query.equalTo("email", externalId);
      query.find({
        success: function(users) {
//          console.log("user - " + JSON.stringify(users[0]));
          return res.json({ callee :  users[0] });
        }
      });
    }
    else {
      var query = new Parse.Query("Account");
      query.equalTo("provider", provider);
      query.equalTo("externalId", externalId);
      query.find({
        success: function(accounts) {
//          console.log("user - " + JSON.stringify(users[0]));
          return res.json({ callee :  accounts[0] });
        }
      });
    }
  },

  findUsersByExternalAccounts : function(req, res) {

    var queryString = req.param('query') ? JSON.parse(decodeURIComponent(req.param('query'))) : [];

    console.log("queryString", queryString);

    var queries = [];
    var emailQueries = [];

    for (var i=0; i<queryString.length; i++) {

      var account = queryString[i];

      if ((account.provider) && (account.eid)) {
        if (account.provider === "email") {
          var query = new Parse.Query(Parse.User);
          query.equalTo("email", account.eid);
          emailQueries.push(query);
        } else {
          var query = new Parse.Query("Account");
          query.equalTo("provider", account.provider);
          query.equalTo("externalId", account.eid);
          queries.push(query);
        }
      }
    }

    if (queries.length > 0) {

      var findUsersQuery = new Parse.Query("Account");
      findUsersQuery._orQuery(queries);

      findUsersQuery.find({
        success: function(accounts) {
          console.log("retrieve all the accounts", accounts);
          return { callee :  accounts };
        },
        error: function(error) {
          return res.json({ error : error });
        }
      }).then(function(callee) {
          if (emailQueries.length > 0) {
            console.log("retrieve email accounts");
            var findUsersByEmailsQuery = new Parse.Query(Parse.User);
            findUsersByEmailsQuery._orQuery(emailQueries);
            findUsersByEmailsQuery.find({
              success: function(users) {
                
                console.log("users", users[0]);

                if (users[0]) {
                  
                  var result = {
                    "provider": "email",
                    "externalId": users[0].get("email"),
                    "objectId": users[0].id
                  }
  
                  callee.push(result);
                  console.log("result after consolidation 1 ", result);
                  console.log("result after consolidation 2 ", callee);
                }
                
                return res.json(callee);
              },
              error: function(error) {
                return res.json({ error : error });
              }
            });
          } else {
            return res.json(callee);
          }
        });
    } else if (emailQueries.length > 0) {
      var findUsersByEmailsQuery = new Parse.Query(Parse.User);
      findUsersByEmailsQuery._orQuery(emailQueries);
      findUsersByEmailsQuery.find({
        success: function(users) {
          console.log("users", users[0]);

          if (users[0]) {
            var result = {
              "provider": "email",
              "externalId": users[0].get("email"),
              "objectId": users[0].id
            };
  
            return res.json([result]);
          } else {
            return res.json([]);
          }
        },
        error: function(error) {
          return res.json({ error : error });
        }
      });
    } else {
      return res.json([]);
    }

  },

  getUserExternalAccounts : function(req, res) {
    var accountQuery = new Parse.Query("Account");
    accountQuery.equalTo("user", req.user);
    accountQuery.find({
      success: function(accounts) {
        var connectedAccounts = [];
        for (var i=0; i<accounts.length;i++) {

          var connectedAccount = {
            provider : accounts[i].get("provider"),
            externalId : accounts[i].get("externalId")
          }

          console.log("connectedAccount ", connectedAccount);
          connectedAccounts.push(connectedAccount);
        }
        console.log("connectedAccounts", connectedAccounts);
        return res.json(connectedAccounts);
      },
      error: function(error) {
        return res.json(error);
      }
    });
  },

  createDisposableChatRoom : function(req, res) {
    var callee = req.param('callee') ? JSON.parse(req.param('callee')) : null;
    if (callee) {
      var Chatroom = Parse.Object.extend("Chatroom");
      var caller = {
          'id': req.user.id,
          'firstname': req.user.attributes.firstname,
          'lastname': req.user.attributes.lastname,
          'username': req.user.attributes.username
      };
//      var caller = { 'id': 'ABCDEF', 'firstname': 'Chapman', 'lastname':'Hong', 'username':'chapmanhong@gmail.com' };
      var disposableChatRoom = new Chatroom();
      disposableChatRoom.set("caller", caller.id);
      disposableChatRoom.set("callerFirstName", caller.firstname);
      disposableChatRoom.set("callerLastName", caller.lastname);
      disposableChatRoom.set("calleeAccountProvider", callee.provider);
      disposableChatRoom.set("calleeAccountId", callee.eid);
      disposableChatRoom.set("calleeFirstName", callee.firstname);
      disposableChatRoom.set("calleeLastName", callee.lastname);

      var emailflag = req.param('e') ? JSON.parse(req.param('e')) : null;

      disposableChatRoom.save(null, {
        success: function(chatroom, req) {
          // Execute any logic that should take place after the object is saved.
          console.log('New disposableChatRoom created with objectId: ' + chatroom.id);
          if (emailflag) {
              emailChatRoom(caller, callee, emailflag, chatroom.id); //TODO: ? add res as a paramter to the function ? emailChatRoom line 6
          }
          return res.json(chatroom); //TODO: move this return to happen after emailChatRoom line 6
        },
        error: function(chatroom, error) {
          // Execute any logic that should take place if the save fails.
          // error is a Parse.Error with an error code and description.
          console.log('Failed to create new disposableChatRoom, with error code: ' + error.description);
          return res.json({ error : error});
        }
      });
    } else {
      return res.json({ error : "callee is missing"});
    }
  },

  enterDisposableChatRoom : function(req, res) {
    var disposableChatRoomId = req.param('id') ? req.param('id') : null;
    var Chatroom = Parse.Object.extend("Chatroom");
    var query = new Parse.Query(Chatroom);
    query.get(disposableChatRoomId, {
      success: function(chatroom) {
        // Execute any logic that should take place after the object is saved.
        console.log('Retrieved disposableChatRoom with objectId: ' + chatroom.id);
        return res.json(chatroom);
      },
      error: function(chatroom, error) {
        // Execute any logic that should take place if the save fails.
        // error is a Parse.Error with an error code and description.
        console.log('Failed to retrieve disposableChatRoom, with error code: ' + error.description);
        return res.json({ error : error});
      }
    });
  }

};
