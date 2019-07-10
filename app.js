const { 
    port, 
    slackToken, 
    slackSigningSecret,
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

// Initializes your app with your bot token and signing secret
const app = new App({
    token: slackToken,
    signingSecret: slackSigningSecret
});

(async () => {
  // Start your app
  await app.start(process.env.PORT);

  console.log('⚡️ Bolt app is running!');
})();