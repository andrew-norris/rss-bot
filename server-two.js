
const port = 8080

const slackButtonPath = '/'
const authRedirectPath = '/auth/redirect'

const firebaseManager = require('./FirebaseManager')
const feedManager = require('./FeedManager')
const slackManager = require('./SlackManager')

const express = require('express')
const formidable = require('express-formidable')
const request = require('request')

const app = express()

const server = app.listen(port, () => {
    console.log(`express running - PORT: ${server.address().port}`)
})

app.get(slackButtonPath, (req, res) => {
    res.sendFile(__dirname + '/slack-button.html')
})

app.get(authRedirectPath, (req, res) => {
    res.send(slackManager.getOptions())
})