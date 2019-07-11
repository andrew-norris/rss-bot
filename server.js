const { 
    port, 
    slackToken, 
    slackSigningSecret,
    slackClientId,
    slackClientSecret,
    slackRedirectUri,
    firebaseApiKey,
    firebaseAuthDomain,
    firebaseDatabaseUrl,
    firebaseProjectId,
    firebaseMessagingSenderId,
    firebaseAppId
} = require('./config');
const { App } = require('@slack/bolt');
var firebase = require('firebase/app');
require('firebase/firestore');

var firebaseConfig = {
    apiKey: firebaseApiKey,
    authDomain: firebaseAuthDomain,
    databaseURL: firebaseDatabaseUrl,
    projectId: firebaseProjectId,
    storageBucket: "",
    messagingSenderId: firebaseMessagingSenderId,
    appId: firebaseAppId
};

firebase.initializeApp(firebaseConfig)

var firestore = firebase.firestore()

const authorizeSlack = async ({teamId, enterpriseId}) => {
  return {
    botToken: slackToken
  }
}

// Initializes your app with your bot token and signing secret
const app = new App({
    authorize: authorizeSlack,
    signingSecret: slackSigningSecret
});

(async () => {
  // Start your app
  await app.start(process.env.PORT);

  console.log(JSON.stringify(app, null, 4));

  console.log('⚡️ Bolt app is running!');
})();



const express = require('express');
const formidable = require('express-formidable')
const expressApp = express();
expressApp.use(formidable())
const request = require('request')



const server = expressApp.listen(7000, () => {
  console.log('Express running -> PORT %s', server.address().port);
});

expressApp.get('/', (req, res) => {
  res.sendFile(__dirname + '/slack-button.html') 
});

expressApp.get('/auth/redirect', (req, res) => {
  console.log("We made it to the get")
  var options = {
    uri: 'https://slack.com/api/oauth.access?code='
      + req.query.code +
      '&client_id='+slackClientId+
      '&client_secret='+slackClientSecret+
      '&redirect_uri='+slackRedirectUri,
    method: 'GET'
  }
  request(options, (error, response, body) => {
    var JSONresponse = JSON.parse(body)
    if (!JSONresponse.ok){
        console.log(JSONresponse)
        res.send("Error encountered: \n"+JSON.stringify(JSONresponse)).status(200).end()
    }else{
        console.log(JSONresponse)

        let channelRef = firestore.collection('channels').doc(JSONresponse.incoming_webhook.channel_id)

        let setChannel = channelRef.set({
          team_name: JSONresponse.team_name,
          team_id: JSONresponse.team_id,
          user_id: JSONresponse.user_id,
          channel: JSONresponse.incoming_webhook.channel,
          url: JSONresponse.incoming_webhook.url
        });


        

        res.send("Success!")
    }
  })
});


expressApp.get('/post/message', (req, res) => {
  console.log('signs of life')
  var webhook = {
    uri: 'https://hooks.slack.com/services/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',
    method: 'POST',
    json: {'text':'Hello, World!'}
  }

  request.post(webhook, (error, response, body) => {
    // var JSONresponse = JSON.parse(body)
    // console.log(JSONresponse)

    res.send("Success!")
  });

});

expressApp.post('/topics', (req, res) => {
  console.log(req.fields)

  let command = req.fields.text
  let topics = command.split(', ').sort()
  var docName = ""
  topics.forEach(function(topic) {
    docName += topic
  })

  let topicRef = firestore.collection('topics').doc(docName)
  let channelRef = firestore.collection('channels').doc(req.fields.channel_id)

  let topic = topicRef.set({})

  topics.forEach(function(topic) {
    var updates = {};
    updates[`topics.${topic}`] = true
    topicRef.update(updates)
    channelRef.update(updates)
  })

  res.send("It Worked").status(200).end()
});



let Parser = require('rss-parser')
let parser = new Parser()

const rssUrl = "https://news.google.com/rss/search?hl=en-CA&gl=CA&ceid=CA:en"


expressApp.get('/feed/post', (req, res) => {
  (async () => {
    await firestore.collection('topics').get()
      .then(querySnapshot => {
        querySnapshot.docs.forEach(doc => {
          console.log("are we here")
          console.log(doc.data().topics)
          let topics = doc.data().topics
          var url = rssUrl + "&q="
          console.log(topics)
          topics.forEach(function(topic) {
            url += topic + ","
          });
          (async () => {
            let feed = await parser.parseURL(url)
            .then(feed => {
              (async () => {
              await firestore.collection('channels').where('topics', 'array-contains', topics[0]).get()
                .then(querySnapshot => {
                  querySnapshot.docs.forEach(channel => {
                    console.log("channel.data().url")
                    var options = {
                      uri: channel.data().url,
                      method: 'POST',
                      json: {'text': feed.items[0].title}
                    }
                    request.post(options, (error, response, body) => {              
                      res.send("Success!")
                    });
                  })
                })
                .catch(err => console.log(err))
              })();
            })
            .catch(err => console.log(err))
          })();
        });
      })
      .catch(err => console.log(err))
  })();
});