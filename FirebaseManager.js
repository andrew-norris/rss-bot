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
                        let itemMap = {
                            title: item['title'],
                            pubDate: item['pubDate']
                        }
                        console.log(`itemmap ${itemMap}`)
                        console.log(`oldposts includes it: ${oldPosts.includes(itemMap)}`)
                        return !includes(oldPosts, item)
                    })    
                }

                console.log(`newPosts: ${newPosts}`)

                

                let titles = items.map(post => {
                    return {
                        title: post['title'],
                        pubDate: post['pubDate']
                    }
                })
                let date = new Date()
                date.setHours(date.getHours() - 7)
            
                oldPosts = oldPosts.filter(item => Date.parse(item.pubDate) > Date.parse(date))
                console.log(oldPosts.length)
                oldPosts = oldPosts.concat(titles)

                console.log(oldPosts.length)

                let itemsToSave = oldPosts.filter((post, index, self) => {
                    let foundIndex = self.findIndex(p => {
                        console.log(`p title: ${p['title']}, post title: ${post['title']}`)
                        return p['title'] === post['title']
                    })
                    console.log(`index: ${index}, foundIndex: ${foundIndex}`)
                    return foundIndex === index
                })

                console.log(itemsToSave.length)



                topicReference.update({
                    posts: itemsToSave
                })    
                
                resolve(newPosts)
            })
        
    })
}

function includes(oldPosts, item) {
    var contains = false
    oldPosts.forEach(post => {
        console.log(JSON.stringify(post['title']))

        if (post['title'] == item['title']) {
            contains = true
        }
    })
    return contains
}