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

// exports.postFeeds = functions.pubsub
//     .schedule('every 2 minutes from 7:00 to 18:00')
//     .onRun((context) => {
//         console.log("We scheduling now");
//         getTopics()
//             .then(topics => {
//                 var topicPostPromises = []
//                 topics.forEach(topic => {
//                     let attachmentsPromise = getFeedItems(topic[feedUrl])
//                         .then(items => {
//                             let newItems = getNewPosts(items)
//                             return filterOldPosts(newItems, topic[topic])
//                         });
//                     let webhookPromise = getSubscribedChannels(topic[topic]);

//                     let topicPostPromise = Promise.all([attachmentsPromise, webhookPromise])
//                         .then(results => {
//                             let attachments = getAttachments(results[0]);
//                             let webhooks = results[1]

//                             var postPromises = []

//                             if (attachments.length > 0) {
//                                 webhooks.forEach(webhook => {
//                                     let options = getMessageOptions(webhook, topic[topic], attachments)
//                                     postPromises.push(postPromise(options))
//                                 })
//                                 return Promise.all(postPromises)
//                             }
//                         }).then(results => {
//                             return results
//                         }).catch(error => {
//                             console.log(error)
//                             return error
//                         });
//                     topicPostPromises.push(topicPostPromise)
//                 })
//                 return topicPostPromises
//             }).catch(error => {
//                 return error
//             })
//     });

exports.postFeeds = functions.pubsub
    .schedule('every 15 minutes')
    .onRun((context) => {

        // let options = getMessageOptions('https://hooks.slack.com/services/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', 'onetwo', 'string')
        // new Promise(resolve => {
        //     request(options, (error, response, body) => {
        //         resolve(body)
        //     })
        // }).then(result => {
        //     console.log(result)
        //     return result
        // }).catch(error => {
        //     console.log(error)
        // })

        let topicsPromise = firestore.collection('topics')
        .get().then(topicQuerySnapShot => {
            let topics = topicQuerySnapShot.docs.map(topic => {
                return {
                    topic: topic.id,
                    feedUrl: topic.data().rss_url
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
                sortedItems.push(feed.items.sort(comparePubDates));
            })
            return sortedItems;
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

        return Promise.all([topicsPromise, feedsItemsPromise, webhooksPromise]).then(result => {
            let topics = result[0];
            let feedItems = result[1];
            let webhooks = result[2];
            console.log(topics);
            console.log(feedItems);
            console.log(webhooks);

            let postPromises = []
            topics.forEach((topic, index) => {
                let attachments = getAttachments(feedItems[index]);
                if (attachments.length > 0) {
                    webhooks[index].forEach(webhook => {
                        let options = getMessageOptions(webhook, topic['topic'], attachments)
                        let postPromise = new Promise(resolve => {
                            request.post(options, (error, response, body) => {
                                resolve(response)
                            })
                        })
                        postPromises.push(postPromise)
                    })
                    
                }
            })
            console.log(postPromises)
            return Promise.all(postPromises)
        }).then(results=> {
            console.log(results);
            return results;
        }).catch(error => {
            console.log(error);
        })
    });
            
       

        // Promise.all([topicsPromise, feedsItemsPromise])

        // getTopics().then(topics => {
        //         var feedItemsPromises = []
        //         topics.forEach(topic => {
        //             let feedItemsPromise = parser.parseURL(topic['feedUrl'])
        //             attachmentsPromises.push(feedItemsPromise)
        //         })
        //         return Promise.all(feedItemsPromises);
        //     }).then(results => {
        //         var filteredPostsPromises = []
        //         results.forEach(result => {
        //             let newItems = getNewPosts(result['items'])
        //             let filteredPostsPromise = filterOldPosts(newItems, result['topic'])
        //             filteredPostsPromises.push(filteredPostsPromise)
        //         })
        //         return Promise.all(filteredPostsPromises);
        //     }).then(results => {
        //         console.log(results);
        //         return results;
        //     }).catch(error => {
        //         console.log(error)
        //         return error
        //     })
        //     return null;
        // });
                        // .then(items => {
                        //     let newItems = getNewPosts(items)
                        //     return filterOldPosts(newItems, topic[topic])
                        // });
    //                 let webhookPromise = getSubscribedChannels(topic[topic]);

    //                 let topicPostPromise = Promise.all([attachmentsPromise, webhookPromise])
    //                     .then(results => {
    //                         let attachments = getAttachments(results[0]);
    //                         let webhooks = results[1]

    //                         var postPromises = []

    //                         if (attachments.length > 0) {
    //                             webhooks.forEach(webhook => {
    //                                 let options = getMessageOptions(webhook, topic[topic], attachments)
    //                                 postPromises.push(postPromise(options))
    //                             })
    //                             return Promise.all(postPromises)
    //                         }
    //                     }).then(results => {
    //                         return results
    //                     }).catch(error => {
    //                         console.log(error)
    //                         return error
    //                     });
    //                 topicPostPromises.push(topicPostPromise)
    //             })
    //             return topicPostPromises
    //         })
    // });

function postPromise(options) {
    return new Promise(resolve => {
        request.post(options, (error, response, body) => {
            resolve(response)
        })
    })
}

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

function comparePubDates(a, b) {
    if (Date.parse(a.pubDate) <= Date.parse(b.pubDate)) {
        return 1
    } else {
        return -1
    }
}

// getTopics = async function() {
//     console.log('getTopics')
//     return new Promise( resolve => {
//         firestore.collection('topics')
//         .get()
//         .then(topicQuerySnapShot => {
//             let topics = topicQuerySnapShot.docs.map(topic => {
//                 return {
//                     topic: topic.id,
//                     feedUrl: topic.data().rss_url
//                 }
//             })
//             resolve(topics)
//         })
//         .catch(error => {
//             console.log(error)
//         })
//     })
// }



// async function filterOldPosts(items, topicName) {
//     console.log('filter old posts')

//     let topicReference = firestore.collection('topics')
//         .doc(topicName)
//     return new Promise(resolve => {
//         topicReference
//             .get()
//             .then(topic => {
//                 var oldPosts = topic.data().posts
//                 if (!oldPosts) {
//                     oldPosts = []
//                 }
//                 var newPosts = items

//                 if (oldPosts.length > 0) {
//                     newPosts = items.filter(item => {
//                         return !includes(oldPosts, item)
//                     })    
//                 }

//                 let titles = items.map(post => {
//                     return {
//                         title: post['title'],
//                         pubDate: post['pubDate']
//                     }
//                 })

//                 let date = new Date()
//                 date.setHours(date.getHours() - 3)
            
//                 oldPosts = oldPosts.filter(item => Date.parse(item.pubDate) > Date.parse(date))
//                 oldPosts = oldPosts.concat(titles)

//                 let itemsToSave = oldPosts.filter((post, index, self) => {
//                     let foundIndex = self.findIndex(p => {
//                         return p['title'] === post['title']
//                     })
//                     return foundIndex === index
//                 })

//                 topicReference.update({
//                     posts: itemsToSave
//                 })    
                
//                 resolve({
//                     'newPosts': newPosts,
//                     'topic': topicName
//                 })
//             })
        
//     })
// }


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