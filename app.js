// Import necessary modules
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');

// Store app's ID and Secret.
var clientId = process.env.clientId;
var clientSecret = process.env.clientSecret;

// Instantiates Express and assigns our app variable to it
var app = express();

// Define a port we want to listen to
const PORT=80;

// Slack Bounce Hook URL
var slackHook = 'https://hooks.slack.com/services/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'

// Parse JSON and send response back
app.get('/', (req, res) => {
  res.send('Postmark Bounce App')
})

app.post('/', function (req, res) {
  res.send('200 Everything is ok');

app.use(bodyParser.json());

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


	
