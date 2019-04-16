$(function() {
  var FADE_TIME = 150;
  var TYPING_TIMER_LENGTH = 400;
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];


  var $window = $(window);
  var $usernameInput = $('.usernameInput');
  var $messages = $('.messages');
  var $inputMessage = $('.inputMessage');

  var $loginPage = $('.login.page');
  var $chatPage = $('.chat.page');
  var $joinGame = $('.joinGame');
  var $leaveGame = $('.leaveGame');
  var $locked = $('.locked');


  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var socket = io();

  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "The General Lobby is Empty";
    } else {
      message += "there are " + data.numUsers + " players in the Lobby";
    }
    log(message);
  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);

    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    message = cleanInput(message);
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }


  function addChatMessage (data, options) {
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  function getUsernameColor (username) {
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  $window.keydown(function (event) {
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  $loginPage.click(function () {
    $currentInput.focus();
  });

  $inputMessage.click(function () {
    $inputMessage.focus();
  });


  $joinGame.click(function () {
    joinGame();

  })

  $leaveGame.click(function () {
    leaveGame();

  })

  // Socket.io Functions

  socket.on('login', function (data) {
    connected = true;
    var message = "Welcome to 1V1 ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  socket.on('user joined', function (data) {
    log(data.username + ' joined the General Lobby');
    addParticipantsMessage(data);
  });

  socket.on('user left', function (data) {
    log(data.username + ' left the General Lobby');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('gameCreated', function (data) {
    console.log("Game Created! ID is: " + data.gameId)
    log(data.username + ' created Game: ' + data.gameId);
    alert("Match Created! ID is: "+ JSON.stringify(data));
  });

//Join into an Existing Match
function joinGame(){
  socket.emit('joinGame');
};

socket.on('joinSuccess', function (data) {
  log('Joining the following match: ' + data.gameId);
});


socket.on('alreadyJoined', function (data) {
  log('You are already in an match: ' + data.gameId);
});


function leaveGame(){
socket.emit('leaveGame');
};

socket.on('leftGame', function (data) {
  log('Leaving Game ' + data.gameId);
  alert("Left Game "+ JSON.stringify(data));

});
});

// Table Functions
function playerInfo() {
    var curryIn = [
        {
            "Name ": "Stephen Curry ",
            "Team ": "Warriors ",
            "Rank ": "7 ",
            "Handicap ": "0.7 "
        },
        {
            "Name ": "Points ",
            "Team ": "Assists ",
            "Rank ": "Steals ",
            "Handicap ": "Blocks "
        },
        {
            "Name ": "28.6 ",
            "Team ": "5.1 ",
            "Rank ": "1.2 ",
            "Handicap ": "0.4 "
        }
    ]

    var playerSelected;

    if (value="val1"){playerSelected = curryIn;}
    else if (value="val2") {
      playerSelected = lebronIn;
    }

    var col = [];
    for (var i = 0; i < playerSelected.length; i++) {
        for (var key in playerSelected[i]) {
            if (col.indexOf(key) === -1) {
                col.push(key);
            }
        }
    }

    var table = document.createElement("table");

    var tr = table.insertRow(-1);

    for (var i = 0; i < col.length; i++) {
        var th = document.createElement("th");
        th.innerHTML = col[i];
        tr.appendChild(th);
    }

    for (var i = 0; i < playerSelected.length; i++) {

        tr = table.insertRow(-1);

        for (var j = 0; j < col.length; j++) {
            var tabCell = tr.insertCell(-1);
            tabCell.innerHTML = playerSelected[i][col[j]];
        }
    }

    var divContainer = document.getElementById("showData");
    divContainer.innerHTML = "";
    divContainer.appendChild(table).innerHTML;
}

function playerInfo1() {

    var lebronIn = [
        {
            "Name ": "Lebron James",
            "Team ": "Lakers ",
            "Rank ": "1 ",
            "Handicap ": "0.2 "
        },
        {
            "Name ": "Points ",
            "Team ": "Assists ",
            "Rank ": "Steals ",
            "Handicap ": "Blocks "
        },
        {
            "Name ": "26.8 ",
            "Team ": "7.6 ",
            "Rank ": "1.3 ",
            "Handicap ": "0.6 "
        }
    ]

    var playerSelected = lebronIn;



    var col = [];
    for (var i = 0; i < playerSelected.length; i++) {
        for (var key in playerSelected[i]) {
            if (col.indexOf(key) === -1) {
                col.push(key);
            }
        }
    }

    var table = document.createElement("table");

    var tr = table.insertRow(-1);

    for (var i = 0; i < col.length; i++) {
        var th = document.createElement("th");
        th.innerHTML = col[i];
        tr.appendChild(th);
    }

    for (var i = 0; i < playerSelected.length; i++) {

        tr = table.insertRow(-1);

        for (var j = 0; j < col.length; j++) {
            var tabCell = tr.insertCell(-1);
            tabCell.innerHTML = playerSelected[i][col[j]];
        }
    }

    var divContainer = document.getElementById("showData");
    divContainer.innerHTML = "";
    divContainer.appendChild(table).innerHTML;
}

function playerInfo2(value) {

    var lebronIn = [
        {
            "Name ": "Anthony Davis",
            "Team ": "New Orleans Pelicans",
            "Rank ": "4 ",
            "Handicap ": "0.9 "
        },
        {
            "Name ": "Points ",
            "Team ": "Assists ",
            "Rank ": "Steals ",
            "Handicap ": "Blocks "
        },
        {
            "Name ": "28.1 ",
            "Team ": "4.2 ",
            "Rank ": "1.6 ",
            "Handicap ": "2.5 "
        }
    ]

    var playerSelected = lebronIn;



    var col = [];
    for (var i = 0; i < playerSelected.length; i++) {
        for (var key in playerSelected[i]) {
            if (col.indexOf(key) === -1) {
                col.push(key);
            }
        }
    }

    var table = document.createElement("table");

    var tr = table.insertRow(-1);

    for (var i = 0; i < col.length; i++) {
        var th = document.createElement("th");
        th.innerHTML = col[i];
        tr.appendChild(th);
    }

    for (var i = 0; i < playerSelected.length; i++) {

        tr = table.insertRow(-1);

        for (var j = 0; j < col.length; j++) {
            var tabCell = tr.insertCell(-1);
            tabCell.innerHTML = playerSelected[i][col[j]];
        }
    }

    var divContainer = document.getElementById("showData");
    divContainer.innerHTML = "";
    divContainer.appendChild(table).innerHTML;
}

function playerInfo3(value) {

    var lebronIn = [
        {
            "Name ": "Terry Rozier ",
            "Team ": "Boston Celtics ",
            "Rank ": "84 ",
            "Handicap ": "4.2 "
        },
        {
            "Name ": "Points ",
            "Team ": "Assists ",
            "Rank ": "Steals ",
            "Handicap ": "Blocks "
        },
        {
            "Name ": "9.1 ",
            "Team ": "3.2 ",
            "Rank ": "0.9 ",
            "Handicap ": "0.3 "
        }
    ]

    var playerSelected = lebronIn;



    var col = [];
    for (var i = 0; i < playerSelected.length; i++) {
        for (var key in playerSelected[i]) {
            if (col.indexOf(key) === -1) {
                col.push(key);
            }
        }
    }

    var table = document.createElement("table");

    var tr = table.insertRow(-1);

    for (var i = 0; i < col.length; i++) {
        var th = document.createElement("th");
        th.innerHTML = col[i];
        tr.appendChild(th);
    }

    for (var i = 0; i < playerSelected.length; i++) {

        tr = table.insertRow(-1);

        for (var j = 0; j < col.length; j++) {
            var tabCell = tr.insertCell(-1);
            tabCell.innerHTML = playerSelected[i][col[j]];
        }
    }

    var divContainer = document.getElementById("showData");
    divContainer.innerHTML = "";
    divContainer.appendChild(table).innerHTML;
}

function playerInfo4(value) {

    var lebronIn = [
        {
            "Name ": "Nick Young ",
            "Team ": "Nuggets ",
            "Rank ": "223 ",
            "Handicap ": "10 "
        },
        {
            "Name ": "Points ",
            "Team ": "Assists ",
            "Rank ": "Steals ",
            "Handicap ": "Blocks "
        },
        {
            "Name ": "2.3 ",
            "Team ": "0.5 ",
            "Rank ": "0.0 ",
            "Handicap ": "0.3 "
        }
    ]

    var playerSelected = lebronIn;



    var col = [];
    for (var i = 0; i < playerSelected.length; i++) {
        for (var key in playerSelected[i]) {
            if (col.indexOf(key) === -1) {
                col.push(key);
            }
        }
    }

    var table = document.createElement("table");

    var tr = table.insertRow(-1);

    for (var i = 0; i < col.length; i++) {
        var th = document.createElement("th");
        th.innerHTML = col[i];
        tr.appendChild(th);
    }

    for (var i = 0; i < playerSelected.length; i++) {

        tr = table.insertRow(-1);

        for (var j = 0; j < col.length; j++) {
            var tabCell = tr.insertCell(-1);
            tabCell.innerHTML = playerSelected[i][col[j]];
        }
    }

    var divContainer = document.getElementById("showData");
    divContainer.innerHTML = "";
    divContainer.appendChild(table).innerHTML;
}

function playerInfo5(value) {

    var lebronIn = [
        {
            "Name ": "Kyrie Irving ",
            "Team ": "Boston Celtics ",
            "Rank ": "15 ",
            "Handicap ": "2.0 "
        },
        {
            "Name ": "Points ",
            "Team ": "Assists ",
            "Rank ": "Steals ",
            "Handicap ": "Blocks "
        },
        {
            "Name ": "23.6 ",
            "Team ": "6.9 ",
            "Rank ": "1.6 ",
            "Handicap ": "0.4 "
        }
    ]

    var playerSelected = lebronIn;



    var col = [];
    for (var i = 0; i < playerSelected.length; i++) {
        for (var key in playerSelected[i]) {
            if (col.indexOf(key) === -1) {
                col.push(key);
            }
        }
    }

    var table = document.createElement("table");

    var tr = table.insertRow(-1);

    for (var i = 0; i < col.length; i++) {
        var th = document.createElement("th");
        th.innerHTML = col[i];
        tr.appendChild(th);
    }

    for (var i = 0; i < playerSelected.length; i++) {

        tr = table.insertRow(-1);

        for (var j = 0; j < col.length; j++) {
            var tabCell = tr.insertCell(-1);
            tabCell.innerHTML = playerSelected[i][col[j]];
        }
    }

    var divContainer = document.getElementById("showData");
    divContainer.innerHTML = "";
    divContainer.appendChild(table).innerHTML;
}
