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

