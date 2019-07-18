const { 
    googleRssUrl
} = require('./config');

let Parser = require('rss-parser')
let parser = new Parser()


exports.getFeedItems = async function(feedUrl) {
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

const topicQueryParameter = '&q='

exports.getFeedUrl = function(topics) {
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

    return url
}

exports.getTopicsMap = function(commandString) {
    let topics = commandString.split(', ').sort()

    return topics
}

exports.getDocumentName = function(topics) {
    var docName = ""
    topics.forEach(function(topic) {
        docName += topic.split().join()
    }) 
       
    return docName
}

exports.getAttachments = function(items) {
    var attachments = []
    items = items.slice(0,10)
    items.forEach(function(item) {
        attachments.push(createAttachment(item))
    })
    return attachments
}

function createAttachment(item) {
    console.log(item.title)
    let [title, author] = item.title.split(' - ')
    console.log(title)
    console.log(author)
    return {
        "author_name": author,
        "title": title,
        "text": item.link
    }
}
