# Postmark Bot

## Introduction

_Postmark Bot_ is a Slack app that can currently do the following:

### Bounce notifications

Send Bounce notification messages from Postmark to a Slack channel of your choice. It also provides a direct link to the Message Details page so that you can investigate further. Like so:

<p><img style="display: block; margin-left: auto; margin-right: auto;" title="" src="/img/bounce_message_example.jpg" border="0" alt="" /></p>

### `/postmark` command

We'll continue to add more slash commands, but for now here's what you can do:

* `/postmark status` --> Provides the current status of the app, with basic incident details and a link to view the full incident page
* `/postmark docs` --> Post a URL to the API documentation for easy access

## Installation

Installation is really simple.

### Step 1

Click the "Add to Slack" button below, and select a channel you would like to post Bounce notifications to. The `/postmark` command will work in any channel.

localhost:

<a href="https://slack.com/oauth/authorize?client_id=2187776628.292902757106&scope=incoming-webhook,commands&redirect_uri=http://localhost:5000/oauth"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>

heroku:

<a href="https://slack.com/oauth/authorize?client_id=2187776628.292902757106&scope=incoming-webhook,commands&redirect_uri=https://pm-slack.herokuapp.com/oauth"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>


### Step 2

You will receive a message in Slack with your unique bounce webhook URL. If you'd like to see bounce notifications in your chosen channel you need to add that URL to the *Bounce Webhook* field in your Postmark account (Settings / Outbound):

<p><img style="display: block; margin-left: auto; margin-right: auto;" title="" src="/img/account_bounce_settings.png" border="0" alt="" /></p>

### Step 3

Enjoy, and let us know if you run into issues and if there are other things you'd like the Postmark Bot to do.