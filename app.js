// Import required modules
require('dotenv').config()
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var crypto = require('crypto');
var moment = require('moment');
var UIDGenerator = require('uid-generator');
var uidgen = new UIDGenerator();
var path = require('path');
var statusHelpers = require('./src/statusHelpers');
var slashCommand = require('./src/slashCommand');

// Store app's ID and Secret
var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;

// Instantiate Express
var app = express();

// Define a port to listen to
var PORT = process.env.PORT || 4390;

// Environment: Local vs. Production
var envURL = process.env.ENV_URL;

// Load JSON parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// *** GLOBAL VARIABLES ***

var dbURI = process.env.MONGODB_URI;
var dbName = process.env.MONGODB_DBNAME;


app.get('/oauth', (req, res) => {

  console.log(req.query.error);

  if (req.query.error === "access_denied") {
      res.status(500);
      res.sendFile(path.join(__dirname + '/html/permission_denied.html'));
      console.log("Permissions rejected.");
  } else if (!req.query.code) {
      res.status(500);
      res.sendFile(path.join(__dirname + '/html/oauth_nocode.html'));
      console.log("Looks like we're not getting code.");
  }  else {

    // If it looks good, call authRequest function

    authRequest(req, res);

    // authRequest function

    function authRequest(req, res) {

      request({
        url: 'https://slack.com/api/oauth.access', //URL to hit
        qs: {                                      //Query string data
          code: req.query.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: envURL + '/oauth'
        },
        method: 'GET',                              //Specify the method

        // Store Slack's OAuth response

      }, function(error, response, body) {
        if (error) {
          console.log("Looks like there's something wrong with Slack's response.");
          res.send({ "Error": "Looks like there's something wrong with Slack's response." });
          return;
        }
          var slackOAuthResponse = JSON.parse(body); // Slack's OAuth response goes here
          res.sendFile(path.join(__dirname + '/html/auth_successful.html'));

          // *** INSERT DB RECORD WITH NEWLY AUTHENTICATED USER DETAILS ***

          // Define Object for new user

          var uuid = uidgen.generateSync() // First, generate a new uuid
          var now = moment(); // Set the current time

          var newBounceUser = {
              uuid: uuid,
              pm_hook: envURL + '/bounce/' + uuid, // Generate unique inbound webhook
              slack_hook: slackOAuthResponse.incoming_webhook.url, // Read Slack's inbound hook URL
              //slack_token: slackOAuthResponse.access_token, *** Not storing token for now - not needed for scopes requested, so it's safer to leave it out
              user_id: slackOAuthResponse.user_id,
              team_name: slackOAuthResponse.team_name,
              team_id: slackOAuthResponse.team_id,
              channel: slackOAuthResponse.incoming_webhook.channel,
              channel_id: slackOAuthResponse.incoming_webhook.channel_id,
              config_url: slackOAuthResponse.incoming_webhook.configuration_url,
              auth_time_unix: moment(now).format("X"), //Store when application was authenticated
              auth_time_utc: moment(now).format("YYYY-MM-DD HH:mm:ss"), //Store a formatted, UTC timestamp as well
              status_opt_in: true
            }

          // Connect to DB

          mongodb.MongoClient.connect(dbURI, function(err, client) {

            if (err) {
              console.log('Can\'t connect to the database');
              res.send({ "Error": "Looks like we can't connect to the database." });
              return;
            }

            var db = client.db(dbName);
            var bounce_users = db.collection(process.env.MONGODB_COLLECTION);

            // Insert new user record

            bounce_users.insert([newBounceUser], function(err, result) {

              if (err) {
                console.log('Can\'t insert the record');
                res.send({ "Error": "Looks like we can't insert the record." });
                return;
              }

              // Let the user know what they need to do to make bounce notifications work
              request({
                url: newBounceUser.slack_hook,
                method: 'POST',
                json: true,
                body: {
                  "text": "👋 Hello! You’ve successfully installed the Postmark Bot. We’ll let you know whenever we add or update an incident on our status page.\n\nIf you'd like to get Bounce and/or Spam Complaint notifications, Click on *Add Webhook* in your *Postmark Server Settings*, select the *Bounce* and/or *Spam Complaint* events, and add this as the *Webhook URL*:\n`" + newBounceUser.pm_hook + "`\n\nType `/postmark help` for the commands you can use."
                },
              })

              // Close the connection
              client.close(function(err) {
                if (err) {
                  console.log('Can\'t close the connection');
                  res.send({ "Error": "Looks like we can't close the database connection." });
                  return;
                }
              });
            });
          });

      })
    }
    }
});

app.get('/bounce/:uuid', (req, res) => {
  res.sendFile(path.join(__dirname + '/html/postmark-slack-app.html'));
})

app.post('/bounce/:uuid', (req, res) => {
  res.send('200 Everything is ok');

  // Define variables we're going to need

  var uuid = req.params.uuid;

  if (req.body.Inactive == true) {
    var emailActive = "*INACTIVE*";
      if (req.body.CanActivate == true) {
        var emailCanActivate = "Email *CAN* be reactivated";
      } else {
        var emailCanActivate = "Email *CAN NOT* be reactivated";
      }
  } else {
    var emailActive = "*ACTIVE*";
    var emailCanActivate = "Email does not need to be reactivated.";
  }

  // Connect to DB

  mongodb.MongoClient.connect(dbURI, function(err, client) {

      if (err) {
        console.log('Can\'t connect to the database');
        res.send({ "Error": "Looks like we can't connect to the database." });
        return;
      }

    var db = client.db(dbName);
    var bounce_users = db.collection(process.env.MONGODB_COLLECTION);


    // Find the right user

    bounce_users.findOne({
      uuid: uuid
    }, function(err, doc) {

      if (err) {
        console.log('Can\'t find record');
        res.send({ "Error": "Looks like we can't find the database record." });
        return;
      }

      var slackInboundURL = doc['slack_hook'];

      // URL to view Bounce details in Postmark activity
      var bounceDetailsURL = 'https://account.postmarkapp.com/servers/' + req.body.ServerID + '/messages/' + req.body.MessageID;

      // POST to Slack hook
      request({
        url: slackInboundURL,
        method: 'POST',
        json: true,
        body: {
          "attachments": [{
            "fallback": "View Bounce details at " + bounceDetailsURL,
            "pretext": "New Bounce received",
            "fields": [
              {
                  "title": "Bounce type",
                  "value": req.body.Name,
                  "short": false
              },
              {
                  "title": "Email address",
                  "value": req.body.Email,
                  "short": true
              },
              {
                  "title": "Subject",
                  "value": req.body.Subject,
                  "short": true
              },
              {
                  "title": "Email status",
                  "value": "The email address is " + emailActive,
                  "short": true
              },
              {
                  "title": "Reactivation status",
                  "value": emailCanActivate,
                  "short": true
              },
             /*
               {
                  "value": "<" + bounceDetailsURL + "|View Bounce details>",
                  "short": false
              },
             */
          ],
            "actions": [{
              "type": "button",
              "text": "View Bounce details",
              "url": bounceDetailsURL,
            }],
            "color": "warning",
            "mrkdwn_in": ["fields"]
          }]
        },
      }, function(error, response, body) {});



      // Close the DB connection
      client.close(function(err) {
      if (err) {
        console.log('Can\'t close the connection');
        res.send({ "Error": "Looks like we can't close the database connection." });
        return;
      }

      });
    });
  });
});

app.post('/status', (req, res) => {
  // Validate the request is legit
  var tokenLength = Buffer.byteLength(process.env.STATUS_TOKEN);
  var a = Buffer.alloc(tokenLength, req.body.slackAppToken);
  var b = Buffer.alloc(tokenLength, process.env.STATUS_TOKEN);

  if (!(crypto.timingSafeEqual(a, b))) {
    console.log("Status tokens don't match");
    return res.status(403).end();
  }

  const message = statusHelpers.createAttachment(req.body);

  mongodb.MongoClient.connect(dbURI, (err, client) => {
    if (err) return res.send({ "Error": "Looks like we can't connect to the database." });

    const db = client.db(dbName);
    const collection = db.collection(process.env.MONGODB_COLLECTION);

    collection.find({ 'status_opt_in': true }).toArray((err, docs) => {
      if (err) return res.send({ "Error": "Looks like we can't find the database record." });

      res.send('OK');

      docs.forEach((item) => {
        // POST to Slack hook
        request({
          url: item.slack_hook,
          method: 'POST',
          json: true,
          body: message,
        });
      });

      // Close the DB connection
      client.close((err) => {
        if (err) return res.send({ "Error": "Looks like we can't close the database connection." });
      });
    });
  });
})


/**
 * Postmark slash command
 */

app.get('/command/postmark', (req, res) => {

  res.sendFile(path.join(__dirname + '/html/postmark-slack-app.html'));

})

app.post('/command/postmark', (req, res) => {
  // Validate the request is legit
  var tokenLength = Buffer.byteLength(process.env.SLASH_TOKEN);
  var a = Buffer.alloc(tokenLength, req.body.token);
  var b = Buffer.alloc(tokenLength, process.env.SLASH_TOKEN);

  if (!(crypto.timingSafeEqual(a, b))) {
    console.log("Tokens don't match");
    return res.status(403).end();
  }

  // Send empty 200 immediately
  res.send('');

  // Provide help
  slashCommand.parse(req.body);
})


// Basic routes

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/html/postmark-slack-app.html'));
});

app.post('/', function(req, res) {
  res.send('200 Everything is ok');
});


// Start server
app.listen(PORT, function() {

  //Callback triggered when server is successfully listening.
  console.log("Postmark bounce app listening on port " + PORT);
});
