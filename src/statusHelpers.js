const moment = require('moment');

/**
 * Constructs a Slack attachment containing the latest status
 * @param  {Object} config Config returned from the status service
 * @return {Object}
 */
exports.createAttachment = (config, showTime) => (
  {
    "attachments": [{
      "fallback": "",
      "author_name": this.statusInfo[config.status].title,
      "author_icon": `https://assets.wildbit.com/postmark/emails/images/status-icons/${config.status.toLowerCase()}-fill.png`,
      "color": this.statusInfo[config.status].color,
      "fields": [
        ...config.status === 'UP' ? [{
            "value": "_Details about the last incident:_",
            "short": false
        }] : [],
        {
          "value": `*<${this.incidentURL(config.lastIncident.id)}|${config.lastIncident.title}>*`,
          "short": false
        },
        {
          "value": config.lastIncident.body,
          "short": false
        },
        {
          "title": `Last update ${showTime ? moment(config.lastIncident.updated_at).fromNow() : ''}`,
          "value": this.lastUpdate(config.lastIncident.updates),
          "short": false
        }
      ],
      "actions": [{
        "type": "button",
        "text": "View incident timeline",
        "url": this.incidentURL(config.lastIncident.id)
      }]
    }]
  }
)


/**
 * Generates incident URL
 * @param  {Integer} id Incident ID
 * @return {String}
 */
exports.incidentURL= (id) => (
  `https://status.postmarkapp.com/incidents/${id}`
)


/**
 * Options for presenting each status title and color
 */
exports.statusInfo = Object.freeze({
  UP: {
    color: '#4dc47e',
    title: 'All systems operational'
  },
  MAINTENANCE: {
    color: '#a5adb4',
    title: 'Scheduled Maintenance'
  },
  DELAY: {
    color: '#f6a823',
    title: 'External Delays',
  },
  DEGRADED: {
    color: '#f6a823',
    title: 'Degraded Performance',
  },
  DOWN: {
    color: '#c72d3f',
    title: 'Service Offline',
  }
})


/**
 * Get the last update’s body text
 * @param  {Array} updates
 * @return {String}
 */
exports.lastUpdate = (updates) => (
  updates[updates.length - 1].body
)
