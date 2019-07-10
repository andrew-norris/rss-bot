require('dotenv').config({path: __dirname + '/variables.env'})

module.exports = {
    port: process.env.PORT,
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
}