var express = require('express');
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 2000;
var loopLimit = 0;

server.listen(port, function () {
  console.log('Server running on:', port);
});

app.use(express.static(__dirname + '/client'));

var gameCollection =  new function() {
  this.totalGameCount = 0,
  this.gameList = []
};

 // Lobby Creating Functions
function makeaGame(socket) {

     var gameObject = {};
     gameObject.id = (Math.random()+1).toString(36).slice(2, 18);
     gameObject.playerOne = socket.username;
     gameObject.playerTwo = null;
     gameCollection.totalGameCount ++;
     gameCollection.gameList.push({gameObject});

     console.log("Lobby Created by "+ socket.username + " Id: " + gameObject.id);
    io.emit('gameCreated', {
      username: socket.username,
      gameId: gameObject.id
    });
}

 // Lobby Finding Functions and Sockets

function lobbyFinder (socket) {
    ++loopLimit;
    if (( gameCollection.totalGameCount == 0) || (loopLimit >= 20)) {

    makeaGame(socket);
    loopLimit = 0;

    } else {
    var rndPick = Math.floor(Math.random() * gameCollection.totalGameCount);
    if (gameCollection.gameList[rndPick]['gameObject']['playerTwo'] == null)
    {
      gameCollection.gameList[rndPick]['gameObject']['playerTwo'] = socket.username;
      socket.emit('joinSuccess', {
        gameId: gameCollection.gameList[rndPick]['gameObject']['id'] });

      console.log( socket.username + " has been added to: " + gameCollection.gameList[rndPick]['gameObject']['id']);

    } else {

      lobbyFinder(socket);
    }
  }
}
 // Lobby Deleting functions and Sockets
function delGame(socket) {
  var notInGame = true;
  for(var i = 0; i < gameCollection.totalGameCount; i++){

    var gameId = gameCollection.gameList[i]['gameObject']['id']
    var plyr1Tmp = gameCollection.gameList[i]['gameObject']['playerOne'];
    var plyr2Tmp = gameCollection.gameList[i]['gameObject']['playerTwo'];

    if (plyr1Tmp == socket.username){
      --gameCollection.totalGameCount;
      console.log("Deleted lobby "+ gameId);
      gameCollection.gameList.splice(i, 1);
      console.log(gameCollection.gameList);
      socket.emit('leftGame', { gameId: gameId });
      io.emit('gameDeleted', {gameId: gameId, gameOwner: socket.username });
      notInGame = false;
    }
    else if (plyr2Tmp == socket.username) {
      gameCollection.gameList[i]['gameObject']['playerTwo'] = null;
      console.log(socket.username + " left " + gameId);
      socket.emit('leftGame', { gameId: gameId });
      console.log(gameCollection.gameList[i]['gameObject']);
      notInGame = false;
    }
  }
  if (notInGame == true){
    socket.emit('notInGame');
  }
}

// Chatroom Functions and Sockets

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  socket.on('new message', function (data) {
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  socket.on('add user', function (username) {
    if (addedUser) return;

    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });

    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });

  socket.on('joinGame', function (){
    console.log(socket.username + " wants to join a lobby");

    var alreadyInGame = false;

    for(var i = 0; i < gameCollection.totalGameCount; i++){
    var plyr1Tmp = gameCollection.gameList[i]['gameObject']['playerOne'];
    var plyr2Tmp = gameCollection.gameList[i]['gameObject']['playerTwo'];
    if (plyr1Tmp == socket.username || plyr2Tmp == socket.username){
    alreadyInGame = true;
    console.log(socket.username + " is already in a lobby");

    socket.emit('alreadyJoined', {
    gameId: gameCollection.gameList[i]['gameObject']['id']
    });
     }
    }
    if (alreadyInGame == false){
    lobbyFinder(socket);
    }
    });

    socket.on('leaveGame', function() {
    if (gameCollection.totalGameCount == 0){
     socket.emit('notInGame');
   }
   else {
    delGame(socket);
  }
});

socket.on('lockedup', function () {
   console.log("Player Locked In: " + socket.username);
    io.emit('lockedin', {
  });
});

});
