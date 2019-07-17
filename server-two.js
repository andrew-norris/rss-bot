
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

const server = app.listen(port, () => {
    console.log(`express running - PORT: ${server.address().port}`)
})

app.get(slackButtonPath, (req, res) => {
    res.sendFile(__dirname + '/slack-button.html')
})

app.get(authRedirectPath, (req, res) => {
    let queryCode = req.query.code
    let jsonResponse = requestManager.getJsonBody(
        slackManager.getOptions(queryCode)
    )
    if(jsonResponse.ok) {
        firebaseManager.setChannel(jsonResponse)
        res.send('Success!')
    } else {
        res.send(
            "Error encountered: \n"+JSON.stringify(jsonResponse)
        ).status(200).end()
    }
})

app.post(postTopicsPath, (req, res) => {
    let channelId = req.fields.channelId
    let command = req.fields.text
    let topicsMap = feedManager.getTopicsMap(command)
    let documentName = feedManager.getDocumentName(topicsMap)
    
    firebaseManager.createTopicDocument(documentName, topicsMap)
    firebaseManager.setChannelTopics(channelId, topicsMap)

    let topics = [ ...topicsMap.keys() ]

    res.send(
        `Channels topics are now: ${topics}`
    ).status(200).end()
})

app.get('/test', (req, res) => {
    postFeeds(req, res)
})

async function postFeeds(req, res) {
    firebaseManager.getTopics()
        .then(feedUrls => {
            console.log(feedUrls)

            res.send(JSON.stringify(feedUrls))
                // let feedUrl = topic.data().rssFeedUrl
        
                // feedManager.getFeed(feedUrl)
                //     .then(feed => {
                //         res.send(JSON.stringify(feed))
                //     })
                //     .catch(error => {
                //         console.log(error)
                //     })
            // })
        })
        .catch(error => {
            console.log(error)
        })

    
}