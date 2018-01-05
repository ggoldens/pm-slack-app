# Postmark Bounce Notifier

## Introduction

This is a very basic Slack app that sends Bounce notification messages from Postmark to a Slack channel of your choice. It also provides a direct link to the Message Details page so that you can investigate further. Like so:

<p><img style="display: block; margin-left: auto; margin-right: auto;" title="" src="/img/bounce_message_example.jpg" border="0" alt="" /></p>

## Installation

Installation is really simple.

### Step 1

Click the "Add to Slack" button below, and select a channel you would like to post messages to.

<a href="https://slack.com/oauth/authorize?client_id=2187776628.292902757106&scope=incoming-webhook,commands"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>

### Step 2

You will receive a message in Slack with your unique bounce webhook URL. You need to add that URL to the *Bounce Webhook* field in your Postmark account (Settings / Outbound):

<p><img style="display: block; margin-left: auto; margin-right: auto;" title="" src="/img/account_bounce_settings.png" border="0" alt="" /></p>

### Step 3

Watch the magic happen.