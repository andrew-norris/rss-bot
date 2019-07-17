
const config = require('./config');

const {
    firebaseAuthDomain,
    firebaseDatabaseUrl,
    firebaseProjectId,
    firebaseMessagingSenderId,
    firebaseAppId,
    firebaseApiKey
} = require('./config')

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

exports.setChannel = function(jsonResponse) {
    let channelRef = firestore.collection('channels').doc(jsonResponse.incoming_webhook.channel_id)
    channelRef.set({
        team_name: jsonResponse.team_name,
        team_id: jsonResponse.team_id,
        user_id: jsonResponse.user_id,
        channel: jsonResponse.incoming_webhook.channel,
        url: jsonResponse.incoming_webhook.url
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
    return new Promise( resolve => {
        firestore.collection('topics')
        .get()
        .then(topicQuerySnapShot => {
            let topics = topicQuerySnapShot.docs.map(topic => {
                return {
                    'feedUrl': topic.data().lastCheckedDate,
                    'channels': [1,2,3,4]
                }
            })
            resolve(topics)
        })
        .catch(error => {
            console.log(error)
        })
    })
}
