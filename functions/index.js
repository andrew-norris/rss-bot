const functions = require('firebase-functions');
const request = require('request');
const requestPromise = require('request-promise-native');
const admin = require('firebase-admin');

admin.initializeApp();
const firestore = admin.firestore();

const channels = 'channels';
const topics = 'topics';
const topic = 'topic';
const feedUrl = 'feedUrl';

let Parser = require('rss-parser')
let parser = new Parser()

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

exports.postFeeds = functions.pubsub.schedule('every 1 hours').onRun((context) => {
        let topicsPromise = firestore.collection('topics').get().then(topicQuerySnapShot => {
            let topics = topicQuerySnapShot.docs.map(topic => {
                return {
                    topic: topic.id,
                    feedUrl: topic.data().rss_url,
                    oldPosts: topic.data().posts
                }
            })
            return topics
        })

        let feedsItemsPromise = topicsPromise.then(topics => {
            var feedItemsPromises = [];
            topics.forEach(topic => {
                let feedItemsPromise = parser.parseURL(topic['feedUrl']);
                feedItemsPromises.push(feedItemsPromise);
            })
            return Promise.all(feedItemsPromises);
        }).then(feeds => {
            var sortedItems = [];
            feeds.forEach(feed => {
                sortedItems.push(removeOutdatedItems(feed.items.sort(comparePubDates)));
            })
            return sortedItems;
        })

        let filteredFeedsPromise = Promise.all([topicsPromise, feedsItemsPromise]).then(results => {
            let topics = results[0];
            let items = results[1];
            
            var filteredFeeds = []
            topics.forEach((topic, index) => {
                let filteredItems = items[index].filter(item => {
                    return !includes(topic['oldPosts'], item)
                });
                filteredFeeds.push(filteredItems)
            })

            return filteredFeeds;
        })

        Promise.all([topicsPromise, filteredFeedsPromise]).then(results => {
            let topics = results[0];
            let items = results[1];
            let date = new Date()
            date.setHours(date.getHours() - 3)

            let updatePostsPromises = [];
            topics.forEach((topic, index) => {                
                let postsToKeep = topic['oldPosts'].filter(post => {
                    Date.parse(post.pubDate) > Date.parse(date);
                })

                let newPosts = items[index].map(item => {
                    return {
                        title: item['title'],
                        pubDate: item['pubDate']
                    }
                });

                let itemsToSave = postsToKeep.concat(newPosts)

                let updatePostPromise = firestore.collection('topics').doc(topic['topic']).update({
                    posts: itemsToSave
                });
                updatePostsPromises.push(updatePostPromise);
            })
            return Promise.all(updatePostsPromises)
        }).then(results => {
            return results
        }).catch(error => {
            console.log(error)
        })

        let webhooksPromise = topicsPromise.then(topics => {
            var webhookPromises = [];
            topics.forEach(topic => {
                let webhookPromise = firestore.collection('topics')
                    .doc(topic['topic'])
                    .collection('subscribed-channels')
                    .get();
                webhookPromises.push(webhookPromise);
            })
            return Promise.all(webhookPromises);  
        }).then(channelsSnapshots => {
            var webhookArrays = []
            channelsSnapshots.forEach(channelsSnapshot => {
                let webhooks = channelsSnapshot.docs.map(channel => {
                    return channel.data().webhook_url
                })
                webhookArrays.push(webhooks);
            })
            return webhookArrays;
        })

        return Promise.all([topicsPromise, filteredFeedsPromise, webhooksPromise]).then(result => {
            let topics = result[0];
            let filteredFeeds = result[1];
            let webhooks = result[2];

            let postPromises = []
            topics.forEach((topic, index) => {
                let attachments = getAttachments(filteredFeeds[index]);
                if (attachments.length > 0) {
                    webhooks[index].forEach(webhook => {
                        let options = getMessageOptions(webhook, topic['topic'], attachments.slice(0,10))
                        let postPromise = new Promise(resolve => {
                            request.post(options, (error, response, body) => {
                                resolve(response)
                            })
                        })
                        postPromises.push(postPromise)
                    })
                    
                }
            })
            return Promise.all(postPromises)
        }).then(results=> {
            return results;
        }).catch(error => {
            console.log(error);
        })
    });

function getMessageOptions(webhookUrl, feedTitle, attachments) {
    return {
        url: webhookUrl,
        method: 'POST',
        json: 
            {
                "text": feedTitle,
                "attachments": attachments
            }
            
    }
}

function removeOutdatedItems(items) {
    
    let date = new Date()
    date.setHours(date.getHours() - 3)

    return items.filter(item => Date.parse(item.pubDate) > Date.parse(date))
}

function comparePubDates(a, b) {
    if (Date.parse(a.pubDate) <= Date.parse(b.pubDate)) {
        return 1
    } else {
        return -1
    }
}

function includes(oldPosts, item) {
    var contains = false
    oldPosts.forEach(post => {
        console.log(JSON.stringify(post['title']))

        if (post['title'] === item['title']) {
            contains = true
        }
    })
    return contains
}

getAttachments = function(items) {
    var attachments = []
    items.forEach(item => {
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