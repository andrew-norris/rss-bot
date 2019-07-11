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
const expressApp = express();
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

        let teamRef = firestore.collection('topics').doc('null').collection('teams').doc(JSONresponse.team_id)

        let setTeam = teamRef.set({
          access_token: JSONresponse.access_token,
          scope: JSONresponse.scope,
          user_id: JSONresponse.user_id,
          team_name: JSONresponse.team_name
        })


        

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