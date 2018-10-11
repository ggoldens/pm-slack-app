const request = require('request');
const mongodb = require('mongodb');
const statusHelpers = require('./statusHelpers');

const dbURI = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME;
const statusURL = 'https://status.postmarkapp.com/api/1.0'

/**
 * Parse the slash command
 * @param  {String} responseURL Slack URL to POST back to
 * @param  {String} text        Text from command
 */
exports.parse = (requestBody) => {
  const responseURL = requestBody.response_url;
  const text = requestBody.text;

  if (text === "" || text === "help") {
    this.help(responseURL);
  } else if (text === "status") {
    this.status(responseURL);
  } else if (text === "docs") {
    this.docs(responseURL);
  } else if (text === "status on") {
    this.statusOn(requestBody);
  } else if (text === "status off") {
    this.statusOff(requestBody);
  } else {
    this.unknown(responseURL);
  }
}


/**
 * Returns instructions
 * @param  {String} responseURL
 */
exports.help = (responseURL) => {
  request({
  url: responseURL,
  method: 'POST',
  json: true,
  body: {
    "response_type": "ephemeral",
    "text": "👋 Hello! Here are a list of available commands:\n\n`/postmark status` --> Get the current app status.\n`/postmark status on` --> Receive Postmark status notifications in this channel.\n`/postmark status off` --> Turn off status notifications in this channel.\n`/postmark docs` --> Get a link developer docs URL for easy access.\n\n_Questions? Feel free to reach out to <mailto:support@postmarkapp.com|support@postmarkapp.com>._"
    },
  }, function(error, response, body) {});
}


/**
 * Current status
 * @param  {String} responseURL
 */
exports.status = (responseURL) => {
  request.get(`${statusURL}/status`, (err, res, statusBody) => {
    if (err) return res.status(500).send('Yikes. There was an issue getting the latest status.')

    request.get(`${statusURL}/last_incident`, (err, res, incidentBody) => {
      if (err) return res.status(500).send('Yikes. There was an issue getting the latest status.')

      // Construct message attachment
      const message = statusHelpers.createAttachment({
        status: JSON.parse(statusBody).status,
        lastIncident: JSON.parse(incidentBody)
      }, true);

      // Post message to Slack
      request({
        url: responseURL,
        method: 'POST',
        json: true,
        body: {
          "response_type": "in_channel",
          ...message
        },
      });

    });
  });
}


/**
 * Turn status updates on
 * @param  {String} responseURL
 */
exports.statusOn = (requestBody) => {
  this.updateStatus(requestBody.team_id, requestBody.channel_id, true, (err, result) => {
      let responseText = '✅ Postmark status notifications have been turned on. We’ll give you a heads if we add or update an incident on our status page.'

      if (err) {
        responseText = 'There was an issue turning on your status notifications. Try `/postmark status on` again. If you keep running into issues feel free to reach out to support@postmarkapp.com.'
      } else if (result.result.n === 0) {
        responseText = 'Looks like we don’t have access to this channel. You’ll need to install the <http://slack.postmarkapp.com|Postmark Bot> in this channel to receive status notifications.'
      }

      request({
        url: requestBody.response_url,
        method: 'POST',
        json: true,
        body: {
          "response_type": "in_channel",
          "text": responseText
        },
      });
  })
}


/**
 * Turn status updates off
 * @param  {String} responseURL
 */
exports.statusOff = (requestBody) => {
  this.updateStatus(requestBody.team_id, requestBody.channel_id, false, (err, result) => {
      let responseText = 'Postmark status notifications have been turned off. Type `/postmark status on` if you change your mind.'

      if (err) {
        responseText = 'There was an issue turning off status notifications. Try `/postmark status on` again. If you keep experiencing issues feel free to reach out to support@postmarkapp.com.'
      } else if (result.result.n === 0) {
        responseText = 'Looks like the Postmark Bot is not enabled in this channel. Head over to <http://slack.postmarkapp.com|slack.postmarkapp.com> and grant access to this channel.'
      }

      request({
        url: requestBody.response_url,
        method: 'POST',
        json: true,
        body: {
          "response_type": "in_channel",
          "text": responseText
        },
      });
  })
}

/**
 * Finds a record with matching team and channel ID
 * then updates the opt in for status notifications
 * @param  {String}   teamId              Slack team ID
 * @param  {String}   channelId           Slack channel ID
 * @param  {Boolean}  statusNotifications Turn status notifications on or off
 * @param  {Function} callback
 */
exports.updateStatus = (teamId, channelId, statusNotifications, callback) => {
  mongodb.MongoClient.connect(dbURI, (err, client) => {
    if (err) return res.send({ 'Error': 'There was a problem updating your status notifications.' });

    const db = client.db(dbName);
    const collection = db.collection(process.env.MONGODB_COLLECTION);

    collection.updateMany({
      'team_id': teamId,
      'channel_id': channelId
    } , { $set: { 'status_opt_in' : statusNotifications } }, (err, result) => {
      callback(err, result);

      // Close the DB connection
      client.close((err) => {
        if (err) return console.error('Can’t close the database connection.');
      });
    });
  });
}

/**
 * API docs
 * @param  {String} responseURL
 */
exports.docs = (responseURL) => {
  request({
    url: responseURL,
    method: 'POST',
    json: true,
    body: {
      "response_type": "ephemeral",
      "text": 'API documentation is at https://postmarkapp.com/developer'
    }
  });
}


/**
 * Unknown command
 * @param  {String} responseURL
 */
exports.unknown = (responseURL) => {
  request({
    url: responseURL,
    method: 'POST',
    json: true,
    body: {
      "response_type": "ephemeral",
      "text": "Sorry, that command doesn't work. Use `/postmark help` for a list of commands.",
    }
  });
}
