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
    firebaseAppId,
    googleRssUrl
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

const authorizeSlack = async ({_, enterpriseId}) => {
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
  console.log(`current time: ${new Date()}`)
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

  let currentTopics

  var updates = {};
  topics.forEach(function(topic) {
    updates[topic] = true
  })
  topicRef.update({
    'topics': updates
  })
  channelRef.update({
    'topics': updates
  })

  res.send(`Channels topics are now: ${topics}`).status(200).end()
});



let Parser = require('rss-parser')
let parser = new Parser()

const rssUrl = "https://news.google.com/rss/search?hl=en-CA&gl=CA&ceid=CA:en"

function postFeeds(req, res) {
  (async () => {
    await firestore.collection('topics').get()
      .then(topicQuerySnapshot => {
        topicQuerySnapshot.docs.forEach(topicDoc => {
          console.log("are we here")
          console.log(topicDoc.data().topics)
          let topics = Object.keys(topicDoc.data().topics)
          
          var lastCheckedDate = ""
          if (topicDoc.data().lastCheckedDate == undefined) {
            lastCheckedDate = "Fri, 05 Jul 2019 07:00:00 GMT"
          } else {
            lastCheckedDate = topicDoc.data().lastCheckedDate
          }
          console.log(`lastchecked date: ${lastCheckedDate}`)
          var url = rssUrl + "&q="
          for (let key of topics) {
            console.log(key)
            url += key + ","
          }
          (async () => {
            console.log(url);
            let feed = await parser.parseURL(url)
              .then(feed => {
                (async () => {
                  feed.items = feed.items.sort(compareDates)
                  console.log("we got the feed")
                  console.log(topics)
                  var query = firestore.collection('channels')
                  for (let key of topics) {
                    query = query.where(`topics.${key}`, '==', true)
                  }
                  await query.get()
                    .then(channelQuerySnapshot => {
                      channelQuerySnapshot.docs.forEach(channelDoc => {
                        console.log(channelDoc.data().channel)
                        console.log(Object.keys(channelDoc.data().topics).length)
                        console.log(topics.length)
                        if (Object.keys(channelDoc.data().topics).length == topics.length) {

                          var feedIndex = 0
                          console.log(`outside while ${feed.items[feedIndex].title}, ${feed.items[feedIndex].pubDate}, last checked: ${lastCheckedDate}`)
                          console.log(`outside while ${feed.items[feedIndex+1].title}, ${feed.items[feedIndex+1].pubDate}, last checked: ${lastCheckedDate}`)
                          while (Date.parse(feed.items[feedIndex].pubDate) > Date.parse(lastCheckedDate)) {
                            console.log(`inside while ${feed.items[feedIndex].pubDate}`)
                            var options = {
                              uri: channelDoc.data().url,
                              method: 'POST',
                              json: {
                                'text': feed.items[feedIndex].title,
                                'attachments': [
                                  {
                                    'text': feed.items[feedIndex].link
                                  }
                                ]
                              }
                            }
                            request.post(options, (error, response, body) => {              
                              // res.send('Success!')
                            });

                            feedIndex += 1
                          }
                        }
                      })
                      console.log(`update feed date ${feed.items[0].pubDate}`)
                      var newCheckedDate = feed.items[0].pubDate
                      if (Date.parse(newCheckedDate) > Date.parse(lastCheckedDate)) {
                        topicDoc.ref.update({
                          'lastCheckedDate': feed.items[0].pubDate
                        })
                      }
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
  if (res != null) {
    res.send("Success!")
  }
}


expressApp.get('/feed/post', (req, res) => {
  postFeeds(req, res)
})


let isWorking = false;

setInterval(() => {
  if (isWorking) {
    return;
  }
  
  isWorking = true;
  console.log(`polling at ${new Date()}`);
  postFeeds(null, null)
  isWorking = false;
}, 300000);



function compareDates(a,b) {
  if (Date.parse(a.pubDate) <= Date.parse(b.pubDate)) {
    return 1
  } else {
    return -1
  }
}