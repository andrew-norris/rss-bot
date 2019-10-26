const functions = require('firebase-functions');
const request = require('request');
const admin = require('firebase-admin');

admin.initializeApp();
const firestore = admin.firestore();

const channels = 'channels';
const topics = 'topics';
const topic = 'topic';
const feedUrl = 'feedUrl';

exports.redirect = functions.https.onRequest((req, res) => {
    console.log(req)
    let code = req.query.code;
    let options = getOptions(code);
    new Promise(resolve => {
        request(options, (error, res, body) => {
            resolve(JSON.parse(body));
        })
    }).then(response => {
        console.log(response);
        if(response.ok) {
            return setChannelPromise(response);
        } else {
            return null;
        }
    }).then(result => {
        res.send(result);
        return result;
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
      };
}

setChannelPromise = function(response) {
    let channel_id = response.incoming_webhook.channel_id;
    let channel_ref = firestore.collection(channels)
        .doc(channel_id);
    return channel_ref.set({
        team_name: response.team_name,
        team_id: response.team_id,
        user_id: response.user_id,
        channel: response.incoming_webhook.channel,
        webhook_url: response.incoming_webhook.url
    });
}

exports.postFeeds = functions.pubsub
    .schedule('every 2 minutes from 7:00 to 18:00')
    .onRun((context) => {
        console.log("We scheduling now");
        getTopics()
            .then(topics => {
                topics.forEach(topic => {
                    let attachmentsPromise = getFeedItems(topic[feedUrl])
                        .then(items => {
                            let newItems = getNewPosts(items)
                            return filterOldPosts(newItems, topic[topic])
                        });
                    let webhookPromise = getSubscribedChannels(topic[topic]);

                    Promise.all([attachmentsPromise, webhookPromise])
                        .then(results => {
                            let attachments = getAttachments(results[0]);
                            let webhooks = results[1]

                            var postPromises = []

                            if (attachments.length > 0) {
                                webhooks.forEach(webhook => {
                                    let options = getMessageOptions(webhook, topic[topic], attachments)
                                    postPromises.push(postPromise(options))
                                })
                                return Promise.all(postPromises)
                            }
                        }).then(results => {
                            return results
                        }).catch(error => {
                            console.log(error)
                            return error
                        })
                })
            }).catch(error => {
                return error
            })
    });

function postPromise(options) {
    return new Promise(resolve => {
        request.post(options, (error, response, body) => {
            resolve(response)
        })
    })
}

getMessegeOptions = function(webhookUrl, feedTitle, attachments) {
    return {
        uri: webhookUrl,
        method: 'POST',
        json: 
            {
                "text": feedTitle,
                "attachments": attachments
            }
            
    }
}

getNewPosts = function(items) {
    console.log(items.length)

    let newItems = removeOutdatedItems(items)
    console.log(newItems.length)

    return newItems
}

function removeOutdatedItems(items) {
    
    let date = new Date()
    date.setHours(date.getHours() - 3)

    return items.filter(item => Date.parse(item.pubDate) > Date.parse(date))
}

getFeedItems = async function(feedUrl) {
    return new Promise(resolve => {
        parser.parseURL(feedUrl)
            .then(feed => {
                resolve(feed.items.sort(comparePubDates))
            })
            .catch(error => {
                console.log(error)
            })
    })
    
}

function comparePubDates(a, b) {
    if (Date.parse(a.pubDate) <= Date.parse(b.pubDate)) {
        return 1
    } else {
        return -1
    }
}

getTopics = async function() {
    console.log('getTopics')
    return new Promise( resolve => {
        firestore.collection('topics')
        .get()
        .then(topicQuerySnapShot => {
            let topics = topicQuerySnapShot.docs.map(topic => {
                return {
                    topic: topic.id,
                    feedUrl: topic.data().rss_url
                }
            })
            resolve(topics)
        })
        .catch(error => {
            console.log(error)
        })
    })
}

async function postFeeds(req, res) {
    firebaseManager.getTopics()
        .then(topics => {
            topics.forEach(topic => {
                let attachmentsPromise = feedManager.getFeedItems(topic['feedUrl'])
                    .then(items => {
                        let filteredItems = postManager.getNewPosts(items)
                        return firebaseManager.filterOldPosts(filteredItems, topic['topic'])
                    })
                let webhookPromise = firebaseManager.getSubscribedChannels('onetwo')

                Promise.all([attachmentsPromise, webhookPromise])
                    .then (results => {
                        let attachments = feedManager.getAttachments(results[0])
                        let webhooks = results[1]

                        if (attachments.length > 0) {
                            webhooks.forEach(webhook => {
                                let options = slackManager.getMessegeOptions(webhook, "onetwo", attachments)
                                requestManager.post(options, (error, response, body) => {

                                })
                            })
                            res.send(attachments)
                        } else {
                            res.send('no new items')
                        }
                    })
                    .catch(error => {
                        console.log(error)
                    })
            })
        })
}

filterOldPosts = async function(items, topicName) {
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
                        return !includes(oldPosts, item)
                    })    
                }

                let titles = items.map(post => {
                    return {
                        title: post['title'],
                        pubDate: post['pubDate']
                    }
                })

                let date = new Date()
                date.setHours(date.getHours() - 3)
            
                oldPosts = oldPosts.filter(item => Date.parse(item.pubDate) > Date.parse(date))
                oldPosts = oldPosts.concat(titles)

                let itemsToSave = oldPosts.filter((post, index, self) => {
                    let foundIndex = self.findIndex(p => {
                        return p['title'] === post['title']
                    })
                    return foundIndex === index
                })

                topicReference.update({
                    posts: itemsToSave
                })    
                
                resolve(newPosts)
            })
        
    })
}

getSubscribedChannels = async function(topicDocumentName) {
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
                resolve(webhooks)
            })
    })
}

getAttachments = function(items) {
    var attachments = []
    items.forEach(function(item) {
        attachments.push(createAttachment(item))
    })
    return attachments
}

function createAttachment(item) {
    let titleMap = splitTitle(item.title)
    console.log(`create attachment#titleMap: ${titleMap}`)
    
    return {
        "author_name": titleMap['author'],
        "title": titleMap['post_title'],
        "text": item.link
    }
}

function splitTitle(title) {
    let parts = title.split(' - ')
    let author = parts.slice(-1).pop()
    let postTitle = parts.slice(0,-1).join()
    
    return {
        author: author,
        post_title: postTitle
    }
}