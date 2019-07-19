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

exports.subscribeToTopic = async function(documentName, channelMap) {
    console.log(`createTopicDocument documentName:${documentName}`)

    let subscribedChannelReference = firestore.collection('topics')
    .doc(documentName)
    .collection('subscribed-channels')
    .doc(channelMap['channel_id'])

    firestore.collection('channels')
        .doc(channelMap['channel_id'])
        .get()
        .then(channelSnapShot => {
            console.log(channelSnapShot.data().webhook_url)
            return channelSnapShot.data().webhook_url
        })
        .then(webhook_url => {
            console.log(webhook_url)
            subscribedChannelReference.set({
                channel_name: channelMap['channel_name'],
                webhook_url: webhook_url
            })
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
                    'topic': topic.id,
                    'feedUrl': topic.data().rss_url
                }
            })
            resolve(topics)
        })
        .catch(error => {
            console.log(error)
        })
    })
}

exports.getSubscribedChannels = async function(topicDocumentName) {
    console.log('getSubscribedChannels')
    return new Promise(resolve => {
        firestore.collection('topics')
            .doc(topicDocumentName)
            .collection('subscribed-channels')
            .get()
            .then(channelsSnapshot => {
                let webhooks = channelsSnapshot.docs.map(channel => {

                    return channel.data().webhook_url
                })
                console.log(webhooks)
                resolve(webhooks)
            })
    })
}

exports.filterOldPosts = async function(items, topicName) {
    console.log('filter old posts')

    let topicReference = firestore.collection('topics')
        .doc(topicName)
    return new Promise(resolve => {
        topicReference
            .get()
            .then(topic => {
                var oldPosts = topic.data().posts
                if (!oldPosts) {
                    oldPosts = []
                }
                var newPosts = items

                if (oldPosts.length > 0) {
                    newPosts = items.filter(item => {
                        oldPosts.includes(item.title)
                    })    
                }

                let titles = items.map(post => {
                    return post['title']
                })

                topicReference.update({
                    posts: titles
                })    
                
                resolve(newPosts)
            })
        
    })
}