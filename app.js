const { port, token, signingSecret } = require('./config');
const { App } = require('@slack/bolt');
var firebase = require('firebase/app');
require('firebase/firestore');


// Initializes your app with your bot token and signing secret
const app = new App({
    token: token,
    signingSecret: signingSecret
});

(async () => {
  // Start your app
  await app.start(process.env.PORT);

  console.log('⚡️ Bolt app is running!');
})();