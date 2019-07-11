const express = require('express');
const app = express();


const server = app.listen(7000, () => {
    console.log('Express running -> PORT %s', server.address().port);
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/slack-button.html') 
});