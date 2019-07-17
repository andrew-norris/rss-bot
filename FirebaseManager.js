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
        webhook_url: jsonResponse.incoming_webhook.url
      });
}

exports.createTopicDocument = function(topicUrl, documentName, topics, channelMap) {
    console.log(`createTopicDocument documentName:${documentName}`)
    let topicReference = firestore.collection('topics').doc(documentName)
    topicReference.set({
        'rss_url': topicUrl,
        'topics': topics
    })
    let subscribedChannelReference = firestore.collection('topics')
        .doc(documentName)
        .collection('subscribed-channels')
        .doc(channelMap['channel_id'])
    subscribedChannelReference.set({
        channel_name: channelMap['channel_name'],
        webhook_url: channelMap['webhook_url']
    })
}

exports.setChannelTopic = function(channelId, documentName) {
    console.log('setChannelTopics') 
    let channelReference = firestore.collection('channels').doc(channelId)
    channelReference.update({
            'topic': documentName
    })
}

exports.getTopics = async function() {
    console.log('getTopics')
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
