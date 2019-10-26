const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//     response.send("Hello from Firebase!");
// });

exports.redirect = functions.https.onRequest((request, response) => {
    let code = request.query.code
    let options = getOptions(code)
    response.send(options)
}); 

getOptions = function(queryCode) {
    return {
        uri: functions.config().slack.oauth_uri
            + '?' +
            queryCode +
            '&client_id='+functions.config().slack.client_id+
            '&client_secret='+functions.config().slack.client_secret,
        method: 'POST'
      }
}