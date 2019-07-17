const { 
    firebaseApiKey,
    firebaseAuthDomain,
    firebaseDatabaseUrl,
    firebaseProjectId,
    firebaseMessagingSenderId,
    firebaseAppId
} = require('./config');

var firebaseConfig = {
    apiKey: firebaseApiKey,
    authDomain: firebaseAuthDomain,
    databaseURL: firebaseDatabaseUrl,
    projectId: firebaseProjectId,
    storageBucket: "",
    messagingSenderId: firebaseMessagingSenderId,
    appId: firebaseAppId
};

var firebase = require('firebase/app');
require('firebase/firestore');
firebase.initializeApp(firebaseConfig)

var firestore = firebase.firestore()

exports.setChannel = function(JSONresponse) {
    let channelRef = firestore.collection('channels').doc(JSONresponse.incoming_webhook.channel_id)
    channelRef.set({
        team_name: JSONresponse.team_name,
        team_id: JSONresponse.team_id,
        user_id: JSONresponse.user_id,
        channel: JSONresponse.incoming_webhook.channel,
        url: JSONresponse.incoming_webhook.url
      });
}

exports.createTopicDocument = function(documentName, topicsMap) {
    let topicReference = firestore.collection('topics').doc(documentName)
    topicReference.set({
        'topics': topicsMap
    })
}

exports.setChannelTopics = function(channelId, topicsMap) {
    let channelReference = firestore.collection('channels').doc(channelId)
    channelReference.update({
            'topics': topicsMap
    })

}

exports.getTopics = async function() {
    firestore.collection('topics')
        .get()
        .then(topicQuerySnapShot => {
            return topicQuerySnapShot.docs
        })
}
