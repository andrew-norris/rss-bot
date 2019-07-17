const request = require('request')

exports.getJsonBody = function(options) {
    request(options, (error, response, body) => {
        return JSON.parse(body)
    })
} 

exports.post = function(options) {
    request.post(options, (error, response, body) => {

    })
}