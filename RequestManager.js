const request = require('request')

exports.getJsonBody = async function(options) {
    return new Promise(resolve => {
        request(options, (error, response, body) => {
            resolve(JSON.parse(body))
        })
    })
} 

exports.post = function(options) {
    request.post(options, (error, response, body) => {
    })
}