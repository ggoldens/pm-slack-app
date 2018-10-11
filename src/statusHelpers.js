/**
 * Constructs a Slack attachment containing the latest status
 * @param  {Object} config Config returned from the status service
 * @return {Object}
 */
exports.createAttachment = (config) => (
  {
    "attachments": [{
      "fallback": "",
      "author_name": this.statusInfo[config.status].title,
      "author_icon": `https://assets.wildbit.com/postmark/emails/images/status-icons/${config.status.toLowerCase()}-fill.png`,
      "color": this.statusInfo[config.status].color,
      "fields": [
        ...config.status === 'UP' ? [{
            "title": "",
            "value": "Details about the last incident:",
            "short": false
        }] : [],
        {
          "title": config.lastIncident.title,
          "value": config.lastIncident.body,
          "short": false
        },
        {
          "title": "Last update",
          "value": this.lastUpdate(config.lastIncident.updates),
          "short": false
        }
      ],
      "actions": [{
        "type": "button",
        "text": "View incident timeline",
        "url": `https://status.postmarkapp.com/incidents/${config.lastIncident.id}`
      }]
    }]
  }
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
