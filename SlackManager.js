const { 
    slackClientId,
    slackClientSecret,
    slackRedirectUri,
    slackOauthUri
} = require('./config');

exports.getOptions = function(queryCode) {
    return {
        uri: slackOauthUri
          + queryCode +
          '&client_id='+slackClientId+
          '&client_secret='+slackClientSecret+
          '&redirect_uri='+slackRedirectUri,
        method: 'GET'
      }
}

exports.getMessegeOptions = function(webhookUrl, feedTitle, attachments) {
    return {
        uri: webhookUrl,
        method: 'POST',
        json: 
            {
                "text": feedTitle,
                "attachments": attachments
                // [
                //     {
                //         "fallback": "Plan a vacation",
                //         "author_name": "Owner: rdesoto",
                //         "title": "Plan a vacation",
                //         "text": "https://news.google.com/rss/search?hl=en-CA&gl=CA&ceid=CA:en&q=china"
                //     },
                //     {
                //         "fallback": "Plan a vacation",
                //         "author_name": "Owner: rdesoto",
                //         "title": "Plan a vacation",
                //         "text": "I've been working too hard, it's time for a break."
                //     }
                // ]
            }
            
    }
}

