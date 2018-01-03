// Import necessary modules
require('dotenv').config()
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');

// Store app's ID and Secret.
var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;

// Instantiates Express and assigns our app variable to it
var app = express();

// Define a port to listen to
const PORT=4390;

// Slack Bounce Hook URL
var slackHook = 'https://hooks.slack.com/services/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'

// Load JSON parser
app.use(bodyParser.json());

// *** Oauth ***

// Set up routes

// This route handles get request to a /oauth endpoint. We'll use this endpoint for handling the logic of the Slack oAuth process behind our app.
app.get('/oauth', function(req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        // If it's there...

        // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
        request({
            url: 'https://slack.com/api/oauth.access', //URL to hit
            qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret}, //Query string data
            method: 'GET', //Specify the method

        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                res.json(body);

            }
        })
    }
});


// *** Parse bounce webhook and send to Slack hook ***

// Set up routes
app.get('/', (req, res) => {
  res.send('Postmark Bounce App')
})

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
	url: slackHook,
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


// Start server
app.listen(PORT, function () {
    //Callback triggered when server is successfully listening.
    console.log("Postmark bounce app listening on port " + PORT);
});


	
