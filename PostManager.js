

exports.getNewPosts = function(items) {
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
