# Postmark Slack App

## Introduction

This Slack app works with an active [Postmark](https://postmarkapp.com/) account, and can currently do the following:

### Bounce notifications

Send Bounce notification messages from Postmark to a Slack channel of your choice. The notification also provides a direct link to the Message Details page so that you can investigate further. Like so:

<p><img style="display: block; margin-left: auto; margin-right: auto" title="" src="/img/bounce_example.jpg" border="0" alt="" /></p>

### `/postmark` command

We'll continue to add more functionality to the `/postmark` slash command, but for now here's what you can do:

* `/postmark status` --> Provides the current status of Postmark's services, with basic incident details and a link to view the full incident page
* `/postmark docs` --> Post a URL to the API documentation for easy access

Here's an example of what a status message looks like:

<p><img style="display: block; margin-left: auto; margin-right: auto;" title="" src="/img/status_example.jpg" border="0" alt="" /></p>

## Installation

Installation is really simple.

### Step 1

Click the "Add to Slack" button below, and select a channel you would like to post Bounce notifications to. Don't worry, the `/postmark` command will work in any channel.

<a href="https://slack.com/oauth/authorize?client_id=2187776628.292902757106&scope=incoming-webhook,commands&redirect_uri=https://pm-slack.herokuapp.com/oauth"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>


### Step 2

Once you authenticate successfully, you will receive a message in Slack with your unique bounce webhook URL. **You'll only get this message once, so please save the URL immediately.**

If you'd like to see bounce notifications in your chosen channel you need to add that URL to the **Bounce Webhook** field in your Postmark account (Settings / Outbound):

<p><img style="display: block; margin-left: auto; margin-right: auto;" title="" src="/img/account_bounce_settings.png" border="0" alt="" /></p> 

### Step 3

Enjoy! Please let us know if you run into issues, and if there are other things you'd like the Postmark App to do.

## Notes and limitations

* You can currently only specify one bounce webhook URL in your Postmark account. We know that means that you may not be able to add the Slack App's URL since you may already have a different webhook URL in use. We'll be working on a solution for this limitation.
* To stop receiving bounce notifications, simply remove the URL from your Postmark account.
