// Import necessary modules
require('dotenv').config()
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var UIDGenerator = require('uid-generator');
var uidgen = new UIDGenerator();

// Store app's ID and Secret
var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;

// Instantiates Express and assigns our app variable to it
var app = express();

// Define a port to listen to
var PORT = process.env.PORT || 3000;
var envURL='localhost:5000/'
// var envURL='https://pm-slack-bounce.herokuapp.com/'


// Load JSON parser
app.use(bodyParser.json());


// *** OAUTH ***

// This route handles get request to a /oauth endpoint. It handles the logic of the Slack oAuth process.

app.get('/oauth', function(req, res) {
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        request({
            url: 'https://slack.com/api/oauth.access', //URL to hit
            qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret}, //Query string data
            method: 'GET', //Specify the method

		// Now we have to create a uuid, generate a Postmark Inbound URL, and add the webhook URL that Slack generated to the DB

        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                var slackOAuthResponse = JSON.parse(body);
				res.json("Authentication was successful");
				
				
        // *** INSERT DB RECORD

				// Set data array to be added
				
				var uuid = uidgen.generateSync();
				var slackInboundURL = slackOAuthResponse.incoming_webhook.url;
				var postmarkInboundURL = envURL + uuid;

				
				var newBounceUser = [
				  {
				    uuid: uuid,
				    slack_hook: slackInboundURL,
				    pm_hook: postmarkInboundURL,
				  }
				];
				
				// Connect to DB
				
				var uri = process.env.MONGODB_URI;
				var dbName = 'heroku_mmj6wkv3';
				
				mongodb.MongoClient.connect(uri, function(err, client) {
				  
				  if(err) throw err;
				  
				  var db = client.db(dbName);
				
				  var bounce_users = db.collection('bounce_users');
				
				// Insert new user record
				
				  bounce_users.insert(newBounceUser, function(err, result) {
				    
				    if(err) throw err;
				
				
				        // Send values to console for testing
				
				        bounce_users.find({ uuid : uuid }).limit(1).toArray(function (err, doc) {
				
				          if(err) throw err;
						  
						  doc.forEach(function (doc) {
				            console.log(
				              'The slack hook is ' + doc['slack_hook'] + ', and the Postmark Inbound URL is ' + doc['pm_hook']
				            );
				            });
				         
				           
							// Close the connection
				            client.close(function (err) {
				              if(err) throw err;
				            });
				          });
				        });
				      }
				    );
				
					// Let the user know what they need to do
					
					request({
						url: slackInboundURL,
						method: 'POST',
						json: true,
						body: {"text": "Hello! You've successfully installed the Postmark Bounce Notifier.\nHere is your unique Inbound Webhook URL: `" + postmarkInboundURL + "`"},
						})
				
				
					// Set up unique routes
					
					app.get('/:postmarkInboundURL', (req, res) => {
					  res.send('The Postmark Bounce App is running.')
					})
					
					
					app.post('/:postmarkInboundURL', function (req, res) {
					  res.send('200 Everything is ok');
					
					
					// Message to be sent to Slack hook
					var slackMessage = 
					 '*'
					 + req.body.Name
					 + ' received*\nThe email was sent from '
					 + req.body.From
					 + ' to '
					 + req.body.Email
					 + ', and the subject was "'
					 + req.body.Subject + '".';
					 
					 // URL to view Bounce details in activity
					 var bounceDetailsURL = 'https://account.postmarkapp.com/servers/' + req.body.ServerID + '/messages/' + req.body.MessageID;
					 
					 // POST to Slack hook
					request({
						url: slackInboundURL,
						method: 'POST',
						json: true,
						body: {"text": slackMessage,
							"attachments": [
								{
									"fallback": "View activity details at " + bounceDetailsURL,
									"actions": [
										{
											"type": "button",
											"name": "bounce_details",
											"text": "View details",
											"url": bounceDetailsURL,
											"style": "primary"
										}
									]
								}
							]
						},
					}, function (error, response, body){});
					
					
					})
            }
        })
    }
});





// Set up / routes
app.get('/', (req, res) => {
  res.send('The Postmark Bounce App is running.')
})

/*

app.post('/', function (req, res) {
  res.send('200 Everything is ok');


// Message to be sent to Slack hook
var slackMessage = 
 '*'
 + req.body.Name
 + ' received*\nThe email was sent from '
 + req.body.From
 + ' to '
 + req.body.Email
 + ', and the subject was "'
 + req.body.Subject + '".';
 
 // URL to view Bounce details in activity
 var bounceDetailsURL = 'https://account.postmarkapp.com/servers/' + req.body.ServerID + '/messages/' + req.body.MessageID;
 
 // POST to Slack hook
request({
	url: slackInboundURL,
	method: 'POST',
	json: true,
	body: {"text": slackMessage,
		"attachments": [
			{
				"fallback": "View activity details at " + bounceDetailsURL,
				"actions": [
					{
						"type": "button",
						"name": "bounce_details",
						"text": "View details",
						"url": bounceDetailsURL,
						"style": "primary"
					}
				]
			}
		]
	},
}, function (error, response, body){});


})

*/

// Start server
app.listen(PORT, function () {
    //Callback triggered when server is successfully listening.
    console.log("Postmark bounce app listening on port " + PORT);
});


	
