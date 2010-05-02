var node_router = require('./node-router'),
    server = node_router.getServer(),
    url = require('url'),
    qs = require('querystring'),
    sys = require('sys');

function params(req) {
    return qs.parse(url.parse(req.url).query);
}

var messages = [], callbacks = [];
var MESSAGE_BACKLOG = 200;

var channel = new function() {
    this.appendMessage = function(message) {
        var m = {text: message, timestamp: (new Date()).getTime()};
        
        messages.push(m);
        
        while (callbacks.length > 0) {
            callbacks.shift().callback([m]);
        }
        
        while (messages.length > MESSAGE_BACKLOG) {
            messages.shift();
        }
    }
    
    this.query = function(since, callback) {
        var matching = [];
        for (var i = 0; i < messages.length; i++) {
            var message = messages[i];
            if (message.timestamp > since)
                matching.push(message)
        }
        
        if(matching.length > 0) {
            callback(matching);
        } else {
            callbacks.push({ timestamp: new Date(), callback: callback });
        }
    }
    
    setInterval(function () {
        var now = new Date();
        while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
            callbacks.shift().callback([]);
        }
    }, 1000);
}

server.get('/', node_router.staticHandler('index.html'));

server.get('/jquery.js', node_router.staticHandler('jquery.js'));
server.get('/jquery.form.js', node_router.staticHandler('jquery.form.js'));

server.get('/post', function (req, res, match) {
    var text = params(req).text;
    
    if(text.indexOf("<script") != -1) {
        return {};
    }
    
    channel.appendMessage(text);
    return {};
});

server.get('/recv', function (req, res, match) {
    var since = parseInt(params(req).since);
    
    channel.query(since, function(messages) {
        res.simpleJson(200, { messages: messages });
    });
});

server.listen(8080);
