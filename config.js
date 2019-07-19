require('dotenv').config({path: __dirname + '/variables.env'})

//General Exports
    module.exports.port = process.env.PORT


//Slack Exports
    module.exports.slackToken = process.env.SLACK_BOT_TOKEN,
    module.exports.slackSigningSecret = process.env.SLACK_SIGNING_SECRET,
    module.exports.slackClientId = process.env.SLACK_CLIENT_ID,
    module.exports.slackClientSecret = process.env.SLACK_CLIENT_SECRET,
    module.exports.slackRedirectUri = process.env.SLACK_REDIRECT_URI,
    module.exports.slackOauthUri = process.env.SLACK_OAUTH_URI

//Firebase Exports
    module.exports.firebaseApiKey = process.env.FIREBASE_API_KEY,
    module.exports.firebaseAuthDomain = process.env.FIREBASE_AUTH_DOMAIN,
    module.exports.firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL,
    module.exports.firebaseProjectId = process.env.FIREBASE_PROJECT_ID,
    module.exports.firebaseMessagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID,
    module.exports.firebaseAppId = process.env.FIREBASE_APP_ID


//Google RSS Exports
    module.exports.googleRssUrl = process.env.GOOGLE_RSS_URL
