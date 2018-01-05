// Import required modules
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

// Instantiates Express and assign our app variable to it
var app = express();

// Define a port to listen to
var PORT = process.env.PORT || 3000;
var envURL='http://localhost:5000/'
//var envURL='https://pm-slack.herokuapp.com/'


// Load JSON parser
app.use(bodyParser.json());


// *** OAUTH ***

// This route handles the GET request to the /oauth endpoint.

app.get('/oauth', function(req, res) {
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
	    
	    // Do all these things if OAuth succeeds
	    
        request({
            url: 'https://slack.com/api/oauth.access', //URL to hit
            qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret}, //Query string data
            method: 'GET', //Specify the method

		// Store Slack's OAuth response

        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                var slackOAuthResponse = JSON.parse(body); // Slack's OAuth response goes here
				res.send("Authentication was successful");
				
				
        // *** INSERT DB RECORD WITH NEWLY AUTHENTICATED USER DETAILS ***

				// Generate uuid and unique Postmark URL, store Slacks's OAuth responses
				
				var uuid = uidgen.generateSync(); // Generate uuid
				var postmarkInboundURL = envURL + 'bounce/' + uuid; // Generate unique inbound webhook
				var slackInboundURL = slackOAuthResponse.incoming_webhook.url; // Read Slack's inbound hook URL
				var slackTeamName = slackOAuthResponse.team_name;
				var slackTeamID = slackOAuthResponse.team_id;
				var slackChannel = slackOAuthResponse.incoming_webhook.channel;
				var slackConfigURL = slackOAuthResponse.incoming_webhook.configuration_url;

				// Define data array to be added as a new record to the DB
								
				var newBounceUser = [
				  {
				    uuid: uuid,
				    slack_hook: slackInboundURL,
				    pm_hook: postmarkInboundURL,
				    team_name: slackTeamName,
				    team_id: slackTeamID,
				    channel: slackChannel,
				    config_url: slackConfigURL,
				  }
				];
				
				// Connect to DB
				
				var uri = process.env.MONGODB_URI;
				var dbName = process.env.MONGODB_DBNAME;
				
				mongodb.MongoClient.connect(uri, function(err, client) {
				  
				  if(err) throw err;
				  
				  var db = client.db(dbName);
				
				  var bounce_users = db.collection('bounce_users');
				
				// Insert new user record
				
				  bounce_users.insert(newBounceUser, function(err, result) {
				    
				    if(err) throw err;
				
				
		        // Send values to console for testing
				/*
		        bounce_users.find({ uuid : uuid }).limit(1).toArray(function (err, doc) {
		
		          if(err) throw err;
				  
				  doc.forEach(function (doc) {
		            console.log(
		              'The slack hook is ' + doc['slack_hook'] + ', and the Postmark Inbound URL is ' + doc['pm_hook']
		            );
		            });
		        */
				            
				            
				// Let the user know what they need to do to make it all work
					request({
					url: slackInboundURL,
					method: 'POST',
					json: true,
					body: {"text": "Hello! You've successfully installed the Postmark Bounce Notifier. Here is the unique Inbound Webhook URL you should add to the *Bounce Webhook* field in your *Postmark Outbound Settings*:\n`" + postmarkInboundURL + "`"},
					})
		           
				// Close the connection
	            client.close(function (err) {
	              if(err) throw err;
			              
			            });
//			          });
			        });
			      }
			    );
       		}
        })
    }
});

// *** WHEN A NEW BOUNCE IS POSTED, LOOK UP THE CORRECT USER AND POST TO THE APPROPRIATE SLACK HOOK


		// Set up unique routes
		
		app.get('/bounce/:uuid', (req, res) => {
		  res.send('The Postmark Bounce App is running.')
		})
		
		
		app.post('/bounce/:uuid', function (req, res) {
		     res.send('200 Everything is ok');
		  
		     // Commence DB lookup
		  
		     var uuid = req.params.uuid;
		  
		     // Connect to DB
				
			 var uri = process.env.MONGODB_URI;
			 var dbName = process.env.MONGODB_DBNAME;
			
			 mongodb.MongoClient.connect(uri, function(err, client) {
			  
			  if(err) throw err;
			  
			  var db = client.db(dbName);
			
			  var bounce_users = db.collection('bounce_users');
				
				
	         // Find the right user
	
	          bounce_users.find({ uuid : uuid }).limit(1).toArray(function (err, doc) {
	
	          if(err) {
		          return console.log('Couldn\'t find record)');
		          	}
			  
			  doc.forEach(function (doc) {
	            var slackInboundURL = doc['slack_hook'];
	            console.log(
	              'The slack hook is ' + doc['slack_hook'] + ', and the Postmark Inbound URL is ' + doc['pm_hook']);
	              
	              
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
	              
	            });
       
       
           
		// Close the connection
        client.close(function (err) {
              if(err) throw err;
        							});
        						});
			        		}
				      );
				})


app.get('/', function (req, res) {
  res.send('The Postmark Bounce App is running');
});

app.post('/', function (req, res) {
  res.send('200 Everything is ok');
});


// Start server
app.listen(PORT, function () {
    //Callback triggered when server is successfully listening.
    console.log("Postmark bounce app listening on port " + PORT);
});


	
