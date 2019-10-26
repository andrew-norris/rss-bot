const functions = require('firebase-functions');
const request = require('request');
const admin = require('firebase-admin');

admin.initializeApp();
const firestore = admin.firestore();

const channels = "channels"

exports.redirect = functions.https.onRequest((req, res) => {
    console.log(req)
    let code = req.query.code
    let options = getOptions(code)
    new Promise(resolve => {
        request(options, (error, res, body) => {
            resolve(JSON.parse(body));
        })
    }).then(response => {
        console.log(response);
        if(response.ok) {
            return setChannelPromise(response)
        }
        return null;
    }).then(result => {
        res.send(result)
        return result
    }).catch(error => {
        res.send(error);
    });
}); 

getOptions = function(query_code) {
    return {
        uri: functions.config().slack.oauth_uri+
            '?code='+query_code +
            '&client_id='+functions.config().slack.client_id+
            '&client_secret='+functions.config().slack.client_secret,
        method: 'GET'
      }
}

setChannelPromise = function(response) {
    let channel_id = response.incoming_webhook.channel_id
    let channel_ref = firestore.collection(channels)
        .doc(channel_id)
    return channel_ref.set({
        team_name: response.team_name,
        team_id: response.team_id,
        user_id: response.user_id,
        channel: response.incoming_webhook.channel,
        webhook_url: response.incoming_webhook.url
    });
}