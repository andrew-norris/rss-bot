let Parser = require('rss-parser')
let parser = new Parser()


async function getFeed(feedUrl) {
    let feed = await parser.parseURL(feedUrl)
    
    function comparePubDates(a, b) {
        if (Date.parse(a.pubDate) <= Date.parse(b.pubDate)) {
            return 1
        } else {
            return -1
        }
    }
}

