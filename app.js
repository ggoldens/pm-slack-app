// Import required modules
require('dotenv').config()
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var UIDGenerator = require('uid-generator');
var uidgen = new UIDGenerator();
var path = require('path');

// Store app's ID and Secret
var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;

// Instantiates Express and assign our app variable to it
var app = express();

// Define a port to listen to
var PORT = process.env.PORT || 3000;

// Environment: Testing vs. Production
var envURL = 'http://localhost:5000/'
//var envURL='https://pm-slack-pr-1.herokuapp.com/'
//var envURL='https://pm-slack.herokuapp.com/'


// Load JSON parser
app.use(bodyParser.json());

// *** GLOBAL VARIABLES ***

var dbURI = process.env.MONGODB_URI;
var dbName = process.env.MONGODB_DBNAME;

// *** OAUTH ***

// This route handles the GET request to the /oauth endpoint.

app.get('/oauth', function(req, res) {
  if (!req.query.code) {
    res.status(500);
    res.send({ "Error": "Looks like we're not getting code." });
    console.log("Looks like we're not getting code.");
    return;
  } 

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
          redirect_uri: envURL + 'oauth'
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
          
          var uuid = uidgen.generateSync() // Firdt, generate a new uuid
  
          var newBounceUser = {
              uuid: uuid, 
              pm_hook: envURL + 'bounce/' + uuid, // Generate unique inbound webhook
              slack_hook: slackOAuthResponse.incoming_webhook.url, // Read Slack's inbound hook URL
              slack_token: slackOAuthResponse.access_token,
              team_name: slackOAuthResponse.team_name,
              team_id: slackOAuthResponse.team_id,
              channel: slackOAuthResponse.incoming_webhook.channel,
              config_url: slackOAuthResponse.incoming_webhook.configuration_url,
            }
  
          // Connect to DB
  
          mongodb.MongoClient.connect(dbURI, function(err, client) {
  
            if (err) {
              console.log('Can\'t connect to the database');
              res.send({ "Error": "Looks like we can't connect to the database." });
              return;
            }
  
            var db = client.db(dbName);
            var bounce_users = db.collection('bounce_users');
  
            // Insert new user record
  
            bounce_users.insert([newBounceUser], function(err, result) {
  
              if (err) {
                console.log('Can\'t insert the record');
                res.send({ "Error": "Looks like we can't insert the record." });
                return;
              }
  
              // Let the user know what they need to do to make it all work
              request({
                url: newBounceUser.slack_hook,
                method: 'POST',
                json: true,
                body: {
                  "text": "Hello! You've successfully installed the Postmark Bounce Notifier.\nHere is the unique Inbound Webhook URL you should add to the *Bounce Webhook* field in your *Postmark Outbound Settings*:\n`" + newBounceUser.pm_hook + "`"
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
});

// *** WHEN A NEW BOUNCE IS POSTED, LOOK UP THE CORRECT USER IN THE DB AND POST TO THE APPROPRIATE SLACK HOOK


// Set up unique routes

app.get('/bounce/:uuid', (req, res) => {
  res.send('The Postmark Bounce App is running.')
})


app.post('/bounce/:uuid', function(req, res) {
  res.send('200 Everything is ok');

  // Commence DB lookup

  var uuid = req.params.uuid;

  // Connect to DB

  mongodb.MongoClient.connect(dbURI, function(err, client) {

      if (err) {
        console.log('Can\'t connect to the database');
        res.send({ "Error": "Looks like we can't connect to the database." });
        return;
      }

    var db = client.db(dbName);
    var bounce_users = db.collection('bounce_users');


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
      console.log('Record found: ' + doc['slack_hook']);


      // Message to be sent to Slack hook
      var slackMessage =
        '*' +
        req.body.Name +
        ' received*\nThe email was sent from ' +
        req.body.From +
        ' to ' +
        req.body.Email +
        ', and the subject was "' +
        req.body.Subject + '".';

      // URL to view Bounce details in Postmark activity
      var bounceDetailsURL = 'https://account.postmarkapp.com/servers/' + req.body.ServerID + '/messages/' + req.body.MessageID;

      // POST to Slack hook
      request({
        url: slackInboundURL,
        method: 'POST',
        json: true,
        body: {
          "text": slackMessage,
          "attachments": [{
            "fallback": "View activity details at " + bounceDetailsURL,
            "actions": [{
              "type": "button",
              "name": "bounce_details",
              "text": "View details",
              "url": bounceDetailsURL,
              "style": "primary"
            }]
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


// Basic routes

app.get('/', function(req, res) {
  res.send('The Postmark Bounce App is running');
});

app.post('/', function(req, res) {
  res.send('200 Everything is ok');
});


// Start server
app.listen(PORT, function() {

  //Callback triggered when server is successfully listening.
  console.log("Postmark bounce app listening on port " + PORT);
});
