const functions = require('firebase-functions');
const request = require('request');
const admin = require('firebase-admin');

admin.initializeApp();
const firestore = admin.firestore();


exports.redirect = functions.https.onRequest((req, res) => {
    console.log(req)
    let code = req.query.code
    let options = getOptions(code)
    new Promise(resolve => {
        request(options, (error, res, body) => {
            resolve(JSON.parse(body));
        })
    }).then(jsonResponse => {
        console.log(jsonResponse);
        if(jsonResponse.ok) {
            res.send(jsonResponse);
        }
        return null;
    }).catch(error => {
        res.send(error);
    });
}); 

getOptions = function(queryCode) {
    return {
        uri: functions.config().slack.oauth_uri+
            '?code='+queryCode +
            '&client_id='+functions.config().slack.client_id+
            '&client_secret='+functions.config().slack.client_secret,
        method: 'GET'
      }
}