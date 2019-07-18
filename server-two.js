
//General
const port = 8080

//Paths
const slackButtonPath = '/'
const authRedirectPath = '/auth/redirect'
const postTopicsPath = '/topics'

//Managers
const firebaseManager = require('./FirebaseManager')
const feedManager = require('./FeedManager')
const slackManager = require('./SlackManager')
const requestManager = require('./RequestManager')

//Imports
const express = require('express')
const formidable = require('express-formidable')

const app = express()
app.use(formidable())

const server = app.listen(port, () => {
    console.log(`express running - PORT: ${server.address().port}`)
})

app.get(slackButtonPath, (req, res) => {
    res.sendFile(__dirname + '/slack-button.html')
})

app.get(authRedirectPath, (req, res) => {
    let queryCode = req.query.code
    console.log(queryCode)
    requestManager.getJsonBody(
        slackManager.getOptions(queryCode)
    ).then(jsonResponse => {
        console.log(jsonResponse)
        if(jsonResponse.ok) {
            firebaseManager.setChannel(jsonResponse)
            res.send('Success!')
        } else {
            res.send(
                "Error encountered: \n"+JSON.stringify(jsonResponse)
            ).status(200).end()
        }
    })
})

app.post(postTopicsPath, (req, res) => {
    console.log(req.fields)
    let channelId = req.fields.channel_id
    let command = req.fields.text
    let topics = feedManager.getTopicsMap(command)
    let documentName = feedManager.getDocumentName(topics)

    let fakeUrl = "https://news.google.com/rss/search?hl=en-CA&gl=CA&ceid=CA:en&q=china"

    let channelMap = {
        'channel_id': channelId,
        'channel_name': req.fields.channel_name,
        'webhook_url': req.fields.response_url
    }

    firebaseManager.createTopicDocument(fakeUrl, documentName, topics, channelMap)
    firebaseManager.setChannelTopic(channelId, documentName)

    res.send(
        `Channels topics are now: ${topics}`
    ).status(200).end()
})

app.get('/test', (req, res) => {
    postFeeds(req, res)
})

async function postFeeds(req, res) {
    firebaseManager.getTopics()
        .then(topics => {
            console.log(topics.length)
            topics.forEach(topic => {
                feedManager.getFeedItems(topic['feedUrl'])
                    .then(items => { 
                        let attachments = feedManager.getAttachments(items)
                        firebaseManager.getSubscribedChannels('onetwo')
                        .then( webhooks => {
                            webhooks.forEach(webhook => {
                                console.log(webhook)
                                let options = slackManager.getMessegeOptions(webhook, "onetwo", attachments)
                                request.post(options, (error, response, body) => {
                                    console.log(error)
                                })
                            })
                        })
                        
                    
                        res.send(JSON.stringify(items))
                    })
                    .catch(error => {
                        console.log(error)
                    })
            })
        })
        .catch(error => {
            console.log(error)
        })
}

const request = require('request')

async function testPost(req, res) {
    let options = slackManager.getMessegeOptions(
        "https://hooks.slack.com/services/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",
        "test post",
        "test link"
    )
    request.post(options, (error, response, body) => {              
        res.send(response)
    });
    

}

