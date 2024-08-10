const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.resolve("")));

let onlineUsers = [];
let lobbies = {};

// Log when someone opens the page
app.get('/', (req, res) => {
  return res.sendFile('index.html');
});

io.on('connection', (socket) => {
  onlineUsers.push(socket.id);
  io.emit('onlineCount', { count: onlineUsers.length });
  io.emit('updateLobbies', { lobbies: lobbies });

  socket.on('addLobby', (data) => {
    lobbies[data.hostId] = data;
    lobbies[data.hostId].members[data.hostId] = data.hostName;
    io.emit('updateLobbies', { lobbies: lobbies });
  });

  socket.on('removeLobby', (data) => {
    delete lobbies[socket.id];
    io.emit('updateLobbies', { lobbies: lobbies });
  });

  socket.on('joinLobby', (data) => {
    let hostId = data.hostId;
    delete lobbies[data.memberId];

    if (lobbies[hostId]) {
      if (Object.keys(lobbies[hostId].members).length < lobbies[hostId].playerCount) {
        lobbies[hostId].members[data.memberId] = data.name;
        if (Object.keys(lobbies[hostId].members).length === lobbies[hostId].playerCount) {
          let liveLobby = startOnlineGame(lobbies[hostId], {});
          lobbies[hostId] = liveLobby;
          for (let playingId of Object.keys(liveLobby.members)) {
            io.to(playingId).emit('startGame', { lobbies: lobbies, liveLobby: liveLobby });
          }
        }
        io.emit('updateLobbies', { lobbies: lobbies });
      } else {
        console.log(`Lobby ${hostId} is full. Cannot join.`);
      }
    } else {
      console.log(`Lobby ${hostId} does not exist. Cannot join.`);
    }
  });

  socket.on('leaveLobby', (data) => {
    let memberId = data.memberId;
    for (const [hostId, lobby] of Object.entries(lobbies)) {
      if (lobby.members[memberId]) {
        delete lobby.members[memberId];
        io.emit('updateLobbies', { lobbies: lobbies });
        break;
      }
    }
  });

  socket.on('makeMove', (data) => {
    liveLobbyId = getLiveLobby(data.player);
    if (lobbies[liveLobbyId] && Object.keys(lobbies[liveLobbyId].members).length == lobbies[liveLobbyId].playerCount) {
      let liveGameState = lobbies[liveLobbyId].gameState;
      let playerIndex = Object.keys(liveGameState.players).indexOf(data.player);
      let moveTurn = liveGameState.currentTurn;
      if (playerIndex + 1 == liveGameState.currentTurn) {
        //console.log("Valid move", data.player);

        let [validMove, currentMoves] = addMove(data.row, data.col, data.direction, liveLobbyId);
        if (validMove) {
          let completedCells = updateMatrix(currentMoves, liveLobbyId);
          if (completedCells.length != 0) {
            lobbies[liveLobbyId].gameState.points[moveTurn] += completedCells.length;

          }
          else {
            updateTurn(liveLobbyId);
          }
          gameOver(liveLobbyId);
          for (let playingId of Object.keys(lobbies[liveLobbyId].members)) {
            io.to(playingId).emit('updateGame', {
              rowNum: data.row,
              columnNum: data.col,
              color: lobbies[liveLobbyId].gameState.colors[String(moveTurn)],
              direction: data.direction,
              completedCells: completedCells,
              liveLobby: lobbies[liveLobbyId]
            });
          }
        }
      }
      else {
        //console.log("Invalid move", data.player);
      }
    }
  });

  socket.on('updateRematchForm', (data) => {
    lobbies[data.lobbyId].rematch[data.playerId] = !lobbies[data.lobbyId].rematch[data.playerId];
    io.emit('updateRematchForm', { liveLobby: lobbies[data.lobbyId] });
    if (data.liveLobby.gameState.winners.length != 0) {
      rematch(lobbies[data.lobbyId]);
    }
  });

  socket.on('leaveMatch', (data) => {
    let currentLobby = getLiveLobby(data.playerId);
    leaveMatch(currentLobby, data.playerId);
    deleteEmptyLobbies();
    io.to(data.playerId).emit('allowCreateLobby', {});
  })

  socket.on('disconnect', () => {
    onlineUsers.pop(socket.id);
    let currentLobby = getLiveLobby(socket.id);
    leaveMatch(currentLobby, socket.id);
    io.emit('onlineCount', { count: onlineUsers.length });
    deleteEmptyLobbies();
  });
});

function deleteEmptyLobbies() {
  // delete empty lobbies
  let lobbyIds = Object.keys(lobbies);
  for (let lobbyId of lobbyIds) {
    // delete lobby without host
    let hostGone = !Object.keys(lobbies[lobbyId].members).includes(lobbies[lobbyId].hostId);
    let emptyLobby = Object.keys(lobbies[lobbyId].members) == 0;
    if (hostGone || emptyLobby) {
      delete lobbies[lobbyId];
    }
  }

  io.emit('updateLobbies', { lobbies: lobbies });
}

function leaveMatch(currentLobby, leftPlayerId) {
  if (currentLobby != null) {
    let leftPlayerName = lobbies[currentLobby].members[leftPlayerId];
    for (let playerId of Object.keys(lobbies[currentLobby].members)) {
      if (playerId != leftPlayerId) {
        io.to(playerId).emit('leftMatch', { leftPlayer: leftPlayerName });
      }
    }
    delete lobbies[currentLobby].members[leftPlayerId];
  }
}

function rematch(liveLobby) {
  if (!(Object.values(liveLobby.rematch).includes(false))) {
    lobbies[liveLobby.hostId] = startOnlineGame(liveLobby, liveLobby.matchHistory);
    for (let playingId of Object.keys(liveLobby.members)) {
      io.to(playingId).emit('startGame', { lobbies: lobbies, liveLobby: lobbies[liveLobby.hostId] });
    }
  }
}

function getLiveLobby(memberId) {
  let lobbyIds = Object.keys(lobbies);

  for (let lobbyId of lobbyIds) {
    let lobbyMembers = Object.keys(lobbies[lobbyId].members);
    if (lobbyMembers.includes(memberId)) {
      return lobbyId;
    }
  }

  return null;
}

function updateMatrix(currentMoves, liveLobbyId) {
  let completedCells = [];
  for (let move of currentMoves) {

    let moveVars = move.split(' ');
    let moveRow = parseInt(moveVars[0]);
    let moveColumn = parseInt(moveVars[1]);
    let moveDirection = moveVars[2];
    let matrixCell = lobbies[liveLobbyId].matrix[moveRow][moveColumn];
    matrix[moveRow][moveColumn][moveDirection] = 1;
    if (matrixCell['up'] == 1 && matrixCell['down'] == 1 && matrixCell['left'] == 1 && matrixCell['right'] == 1) {
      completedCells.push([moveRow, moveColumn]);
    }
  }
  return completedCells;
}

function gameOver(liveLobbyId) {
  movesLeft = Object.keys(lobbies[liveLobbyId].allMoves).length;
  if (movesLeft == 0) {
    let keys = Object.keys(lobbies[liveLobbyId].gameState.points);
    let maxValue = lobbies[liveLobbyId].gameState.points[keys[0]];
    let maxKeys = [parseInt(keys[0])];

    for (let i = 1; i < keys.length; i++) {
      let currentKey = keys[i];
      let currentValue = lobbies[liveLobbyId].gameState.points[currentKey];

      if (currentValue > maxValue) {
        maxKeys = [parseInt(currentKey)];
        maxValue = currentValue;
      } else if (currentValue === maxValue) {
        maxKeys.push(parseInt(currentKey));
      }
    }
    lobbies[liveLobbyId].gameState.winners = maxKeys;

    // Add match history
    let gameCount = Object.keys(lobbies[liveLobbyId].matchHistory).length;
    lobbies[liveLobbyId].matchHistory[gameCount + 1] = maxKeys;
  }
}

function updateTurn(liveLobbyId) {
  let currentTurn = lobbies[liveLobbyId].gameState.currentTurn;
  if (currentTurn == lobbies[liveLobbyId].gameState.playerCount) {
    lobbies[liveLobbyId].gameState.currentTurn = 1;
  }
  else {
    lobbies[liveLobbyId].gameState.currentTurn += 1;
  }
}

function addMove(row, col, line, liveLobbyId) {
  let direction;
  let matrixRow;
  let matrixColumn;

  if (line == "horizontal") {
    matrixColumn = col;
    if (row == lobbies[liveLobbyId].rows) {
      direction = "down";
      matrixRow = row - 1;
    }
    else {
      direction = "up";
      matrixRow = row;
    }
  }
  if (line == "vertical") {
    matrixRow = row;
    if (col == lobbies[liveLobbyId].columns) {
      direction = "right";
      matrixColumn = col - 1;
    }
    else {
      direction = "left";
      matrixColumn = col;
    }
  }

  let currentMoves = getMoves(matrixRow, matrixColumn, direction);
  if (currentMoves.length == 0) {
    return [false, []];
  }
  else {
    return [true, currentMoves];
  }

}

function getMoves(matrixRow, matrixColumn, direction) {
  let result = []
  let move1 = `${matrixRow} ${matrixColumn} ${direction}`;
  let move2 = lobbies[liveLobbyId].allMoves[move1];
  if (move1 in lobbies[liveLobbyId].allMoves) {
    delete lobbies[liveLobbyId].allMoves[move1];
    result.push(move1);
  }
  if (move2 in lobbies[liveLobbyId].allMoves) {
    delete lobbies[liveLobbyId].allMoves[move2];
    result.push(move2);
  }
  return result;
}

function buildMatrix(rows, columns) {
  const matrix = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => ({ up: 0, down: 0, left: 0, right: 0 }))
  );
  return matrix;
}

function buildGameState(playerCount, members) {
  let colorList = ['#FFD90F', '#0000FF', '#B22234', '#FF00FF', '#00FF00'];
  gameState = {
    winners: [],
    playerCount: playerCount,
    currentTurn: 1,
    points: {},
    colors: {},
  }

  for (let i = 1; i <= playerCount; i++) {
    gameState.points[i] = 0;
    [gameState.colors[i], colorList] = getRandomColor(colorList);
    gameState['players'] = members;
  }

  return gameState;
}

function getRandomColor(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  const poppedValue = array.splice(randomIndex, 1)[0];

  return [poppedValue, array.slice()]; // Return a copy of the modified array
}

function buildMoves(matrix) {
  let allMoves = {}
  let rowCount = matrix.length;
  let columnCount = matrix[0].length;
  for (let ri = 0; ri <= rowCount; ri++) {
    for (let ci = 0; ci <= columnCount; ci++) {

      // HORIZONTALS (up lines, and duplicate downs)
      if (ci != columnCount) {
        if (ri == 0) { // up only, no duplicate
          allMoves[`${ri} ${ci} up`] = ''
        }
        else if (ri == rowCount) { // down only, no duplicate
          allMoves[`${ri - 1} ${ci} down`] = ''
        }
        else {
          allMoves[`${ri} ${ci} up`] = `${ri - 1} ${ci} down`
          allMoves[`${ri - 1} ${ci} down`] = `${ri} ${ci} up`
        }
      }


      // VERTICALS (left lines, and duplicate rights)
      if (ri != rowCount) {
        if (ci == 0) { // left only, no duplicate
          allMoves[`${ri} ${ci} left`] = ''
        }
        else if (ci == columnCount) { // right only, no duplicate
          allMoves[`${ri} ${ci - 1} right`] = ''
        }
        else {
          allMoves[`${ri} ${ci} left`] = `${ri} ${ci - 1} right`
          allMoves[`${ri} ${ci - 1} right`] = `${ri} ${ci} left`
        }
      }
    }
  }
  return allMoves;
}

function startOnlineGame(lobby, matchHistory) {
  gameState = buildGameState(lobby.playerCount, lobby.members);
  matrix = buildMatrix(lobby.rows, lobby.columns);
  allMoves = buildMoves(matrix);
  lobby['gameState'] = gameState;
  lobby['matrix'] = matrix;
  lobby['allMoves'] = allMoves;
  lobby['matchHistory'] = matchHistory;
  lobby['rematch'] = {};
  for (let memberId of Object.keys(lobby.members)) {
    lobby.rematch[memberId] = false;
  }
  return lobby;
}

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});