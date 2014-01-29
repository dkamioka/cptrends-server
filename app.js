/**
* Module loading
*/

var express = require('express')
, io = require('socket.io')
, http = require('http')
, twitter = require('ntwitter')
, _ = require('underscore')
, path = require('path');

// Create the express app
var app = express();

// Create the HTTP server with the express app
var server = http.createServer(app);

// List of string to search for.

var watchHashTags = ['cpbr7'];

var watchList = {
  total: 0,
  hashtags: {}
};

// _.each(watchHashTags, function(v) { watchList.hashtags[v] = 0; });

// Express Setup

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

//We're using bower components so add it to the path to make things easier
app.use('/components', express.static(path.join(__dirname, 'components')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//Our only route! Render it with the current watchList
app.get('/', function(req, res) {
  res.render('index', { data: watchList });
});

//Start a Socket.IO listen
var sockets = io.listen(server);

//Set the sockets.io configuration.
//THIS IS NECESSARY ONLY FOR HEROKU!
// sockets.configure(function() {
//   sockets.set('transports', ['xhr-polling']);
//   sockets.set('polling duration', 10);
// });

//If the client just connected, give them fresh data!
sockets.sockets.on('connection', function(socket) { 
  socket.emit('data', watchList);
});

//Instantiate the twitter component
//You will need to get your own key. Don't worry, it's free. But I cannot provide you one
//since it will instantiate a connection on my behalf and will drop all other streaming connections.
//Check out: https://dev.twitter.com/
var t = new twitter({
    consumer_key: process.env.TWITTER_CONS_KEY,           // <--- FILL ME IN
    consumer_secret: process.env.TWITTER_CONS_SEC,        // <--- FILL ME IN
    access_token_key: process.env.TWITTER_ACC_KEY,       // <--- FILL ME IN
    access_token_secret: process.env.TWITTER_ACC_SEC     // <--- FILL ME IN
  });

//Tell the twitter API to filter on the watchSymbols 
t.stream('statuses/filter', { track: watchHashTags }, function(stream) {
  stream.on('error', function(error, code) { console.log("My error: " + error + ": " + code); });
  //We have a connection. Now watch the 'data' event for incomming tweets.
  stream.on('data', function(tweet) {

    //Make sure it was a valid tweet
    if (tweet.text !== undefined) {

      //We're gunna do some indexOf comparisons and we want it to be case agnostic.
      var text = tweet.text.toLowerCase();
      var v = watchHashTags[0];
      if (text.indexOf(v.toLowerCase()) !== -1) {
        watchList.total++;
        var regexp = new RegExp('#([^\\s]*)','g');
        var allHashTags = text.match(regexp);
              // Remove as tags cpbr7 e #cpbr7 para não contar novamente
              a = allHashTags.indexOf(v);
              console.log('a: ' + a);
              b = allHashTags.indexOf('#' + v);
              console.log('b: ' + b);
              if (a > -1) { allHashTags.splice(a,1); }
              if (b > -1) { allHashTags.splice(b,1); }
              console.log(JSON.stringify(allHashTags,null,4));

              _.each(allHashTags, function(v) {
                watchList.hashtags[v] = ++watchList.hashtags[v] || 1;
                setTimeout(function() { 
                  watchList.hashtags[v]--;
                  console.log('Diminuir Contagem: ' + v, JSON.stringify(watchList,null,4));
                },1000*60*10);
              });

              console.log(JSON.stringify(watchList, null, 4));


              // console.log("#" + v + ": " + text);//JSON.stringify(tweet, null, 4));
              // console.log("Quantidade: " + watchList.hashtags[v]);
            }

          //Send to all the clients
          sockets.sockets.emit('data', watchList);

        }
      });
});

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});