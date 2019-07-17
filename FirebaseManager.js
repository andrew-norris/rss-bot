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

let parseManager = require('./ParseManager')

var firestore = firebase.firestore()

function setChannel(JSONresponse) {
    let channelRef = firestore.collection('channels').doc(JSONresponse.incoming_webhook.channel_id)
    let setChannel = channelRef.set({
        team_name: JSONresponse.team_name,
        team_id: JSONresponse.team_id,
        user_id: JSONresponse.user_id,
        channel: JSONresponse.incoming_webhook.channel,
        url: JSONresponse.incoming_webhook.url
      });
}

function createTopicDocument(documentName, topicsMap) {
    let topicReference = firestore.collection('topics').doc(documentName)
    let topic = topicReference.set({
        'topics': topicsMap
    })
}

function setChannelTopics(channelId, topicsMap) {
    let channelReference = firestore.collection('channels').doc(channelId)
    channelReference.update({
            'topics': topicsMap
    })

}

function getTopicsMap(commandString) {
    let topics = commandString.split(', ').sort()
    var topicsMap = {}
    topics.forEach(function(topic) {
        topicsMap[topic] = true
    })

    return topicsMap
}

function getDocumentName(topicsMap) {
    var docName = ""
    for (let topic of topicsMap) {
        topic = topic.split().join()
        docName += topic
    }

    return docName
}

async function getTopics() {
    firestore.collection('topics')
        .get()
        .then(topicQuerySnapShot => {
            topicQuerySnapShot.docs.forEach(topicDoc => {

            })
        })
}

const topicQueryParameter = '&q='

function getFeedUrl(topics) {
    var url = googleRssUrl

    if (topics.length > 0) {
        url += topicQueryParameter
    }

    topics.forEach(function(topic, index) {
        url += topic
        if (index != topics.length - 1) {
            url += ','
        }
    })
}


