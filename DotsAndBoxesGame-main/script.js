let rows;
let matrix;
let columns;
let players;
let allMoves;

function buildMatrix(rows, columns) {
  const matrix = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => ({ up: 0, down: 0, left: 0, right: 0 }))
  );
  return matrix;
}

function buildPlayers(playerCount) {
  let colorList = ['#FFD90F', '#0000FF', '#B22234', '#FF00FF', '#00FF00'];
  players = {
    winners: [],
    playerCount: playerCount,
    currentTurn: 1,
    points: {},
    colors: {}
  }

  for (let i = 1; i <= playerCount; i++) {
    // Assigning 0 points for each player
    players.points[i] = 0;

    // Generating a random color for each player
    [players.colors[i], colorList] = getRandomColor(colorList);
  }

  return players;
}

function getRandomColor(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  const poppedValue = array.splice(randomIndex, 1)[0];

  return [poppedValue, array.slice()]; // Return a copy of the modified array
}

function addMove(row, col, line) {
  let direction;
  let matrixRow;
  let matrixColumn;

  if (line == "horizontal") {
    matrixColumn = col;
    if (row == rows) {
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
    if (col == columns) {
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

function updateTurn() {
  let currentTurn = players.currentTurn;
  if (currentTurn == players.playerCount) {
    players.currentTurn = 1;
  }
  else {
    players.currentTurn += 1;
  }
}

function getMoves(matrixRow, matrixColumn, direction) {
  let result = []
  let move1 = `${matrixRow} ${matrixColumn} ${direction}`;
  let move2 = allMoves[move1];
  if (move1 in allMoves) {
    delete allMoves[move1];
    result.push(move1);
  }
  if (move2 in allMoves) {
    delete allMoves[move2];
    result.push(move2);
  }
  return result;
}

function clearElement(elementId) {
  const htmlElement = document.getElementById(elementId);
  htmlElement.innerHTML = '';
}

function createLocalGrid() {
  const gridContainer = document.getElementById('localGridContainer');
  let scoresElement = document.createElement('div');
  scoresElement.classList.add('scores');
  gridContainer.appendChild(scoresElement);

  for (let row = 0; row < rows + 1; row++) {
    const rowElement = document.createElement('div');
    rowElement.classList.add('row');

    // Set the grid-template-columns dynamically based on the number of columns
    rowElement.style.gridTemplateColumns = `repeat(${columns + 1}, 40px)`;

    for (let col = 0; col < columns + 1; col++) {
      const column = document.createElement('div');
      column.classList.add('column');
      column.style.width = '40px';
      column.style.height = '40px';

      const cell = document.createElement('div');
      cell.classList.add('cell');

      const horizontalLine = document.createElement('div');
      horizontalLine.classList.add('horizontal-line');

      const verticalLine = document.createElement('div');
      verticalLine.classList.add('vertical-line');

      const clickablePath = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      clickablePath.classList.add('clickable-path');
      clickablePath.setAttribute('viewBox', '0 0 100 100');
      clickablePath.style.pointerEvents = 'all';
      clickablePath.style.width = '100%'; // Increase the clickable area
      clickablePath.style.height = '100%'; // Increase the clickable area

      const horizontalPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      horizontalPath.setAttribute('class', 'path-line');
      horizontalPath.setAttribute('d', 'M0 0 L100 0');
      horizontalPath.setAttribute('fill', 'transparent');
      horizontalPath.setAttribute('stroke-width', '10');

      const verticalPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      verticalPath.setAttribute('class', 'path-line');
      verticalPath.setAttribute('d', 'M0 0 L0 100');
      verticalPath.setAttribute('fill', 'transparent');
      verticalPath.setAttribute('stroke-width', '10');

      clickablePath.appendChild(horizontalPath);
      clickablePath.appendChild(verticalPath);

      if (col < columns) {
        horizontalPath.addEventListener('click', () => {
          //console.log(`Clicked on Horizontal Line: Row ${row + 1}, Column: ${col + 1}`);
          let [validMove, currentMoves] = addMove(row, col, "horizontal");
          if (validMove) {
            let currentTurn = players.currentTurn;

            horizontalLine.classList.add('clicked-line');
            horizontalLine.style.backgroundColor = players.colors[currentTurn];
            horizontalLine.style.opacity = 1;

            let completedCells = updateMatrix(currentMoves);
            if (completedCells.length != 0) {
              players.points[currentTurn] += completedCells.length;
              fillCells(completedCells, players.colors[currentTurn]);
            }
            else {
              updateTurn();
            }
            gameOver();
            displayScores('local', players);
          }
        });
      } else {
        // Make the horizontal line invisible for the last column
        horizontalLine.style.visibility = 'hidden';
      }

      if (row < rows) {
        verticalPath.addEventListener('click', () => {
          //console.log(`Clicked on Vertical Line: Row ${row + 1}, Column: ${col + 1}`);
          let [validMove, currentMoves] = addMove(row, col, "vertical");
          if (validMove) {
            let currentTurn = players.currentTurn;

            verticalLine.classList.add('clicked-line');
            verticalLine.style.backgroundColor = players.colors[currentTurn];
            verticalLine.style.opacity = 1;

            let completedCells = updateMatrix(currentMoves);
            if (completedCells.length != 0) {
              players.points[currentTurn] += completedCells.length;
              fillCells(completedCells, players.colors[currentTurn]);
            }
            else {
              updateTurn();
            }
            gameOver();

            displayScores('local', players);
          }
        });
      } else {
        // Make the vertical line invisible for the last row
        verticalLine.style.visibility = 'hidden';
      }

      column.appendChild(horizontalLine);
      column.appendChild(verticalLine);
      column.appendChild(cell);
      column.appendChild(clickablePath);
      rowElement.appendChild(column);
    }

    gridContainer.appendChild(rowElement);
  }
}

function fillCells(completedCells, cellColor) {
  let opacity = 0.33;
  for (let cellCoordinates of completedCells) {
    let rowNum = cellCoordinates[0];
    let columnNum = cellCoordinates[1];
    let rowElements = document.getElementsByClassName('row');
    let columnElements = rowElements[rowNum].getElementsByClassName('column');
    let foundColumn = columnElements[columnNum];
    let foundCell = foundColumn.getElementsByClassName('cell')[0];
    foundCell.style.backgroundColor = cellColor;
    foundCell.style.opacity = opacity;
  }
}

function displayScores(gameType, gameState) {
  let scoresElement = document.getElementsByClassName('scores')[0];
  scoresElement.innerHTML = '';

  if (gameType == "online") {
    for (let playerNumber = 1; playerNumber <= gameState.playerCount; playerNumber++) {
      let playerInfoContainer = document.createElement('div');
      let playerInfo = document.createElement('span');
      playerInfo.style.color = gameState.colors[playerNumber];
      let names = Object.values(gameState.players);
      if (gameState.winners.length != 0) {
        if (gameState.winners.includes(playerNumber)) {
          playerInfo.textContent = `${names[playerNumber - 1]}: ${gameState.points[playerNumber]} 👑`;
        }
        else {
          playerInfo.textContent = `${names[playerNumber - 1]}: ${gameState.points[playerNumber]}`;
        }
      }
      else {
        if (playerNumber == gameState.currentTurn) {
          playerInfo.textContent = `${names[playerNumber - 1]}: ${gameState.points[playerNumber]} ⇦`;
        }
        else {
          playerInfo.textContent = `${names[playerNumber - 1]}: ${gameState.points[playerNumber]}`;
        }
      }
      playerInfoContainer.appendChild(playerInfo);
      scoresElement.appendChild(playerInfoContainer);
    }
  }
  if (gameType == "local") {
    for (let playerNumber = 1; playerNumber <= gameState.playerCount; playerNumber++) {
      let playerInfoContainer = document.createElement('div');
      let playerInfo = document.createElement('span');
      playerInfo.style.color = gameState.colors[playerNumber];
      if (gameState.winners.length != 0) {
        if (gameState.winners.includes(playerNumber)) {
          playerInfo.textContent = `Player ${playerNumber}: ${gameState.points[playerNumber]} 👑`;
        }
        else {
          playerInfo.textContent = `Player ${playerNumber}: ${gameState.points[playerNumber]}`;
        }
      }
      else {
        if (playerNumber == gameState.currentTurn) {
          playerInfo.textContent = `Player ${playerNumber}: ${gameState.points[playerNumber]} ⇦`;
        }
        else {
          playerInfo.textContent = `Player ${playerNumber}: ${gameState.points[playerNumber]}`;
        }
      }
      playerInfoContainer.appendChild(playerInfo);
      scoresElement.appendChild(playerInfoContainer);
    }
  }
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

function updateMatrix(currentMoves) {
  let completedCells = [];
  for (let move of currentMoves) {
    let moveVars = move.split(' ');
    let moveRow = parseInt(moveVars[0]);
    let moveColumn = parseInt(moveVars[1]);
    let moveDirection = moveVars[2];
    let matrixCell = matrix[moveRow][moveColumn];
    matrix[moveRow][moveColumn][moveDirection] = 1;
    if (matrixCell['up'] == 1 && matrixCell['down'] == 1 && matrixCell['left'] == 1 && matrixCell['right'] == 1) {
      completedCells.push([moveRow, moveColumn]);
    }
  }
  return completedCells;
}

function gameOver() {
  movesLeft = Object.keys(allMoves).length;
  if (movesLeft == 0) {
    let keys = Object.keys(players.points);
    let maxValue = players.points[keys[0]];
    let maxKeys = [parseInt(keys[0])];

    for (let i = 1; i < keys.length; i++) {
      let currentKey = keys[i];
      let currentValue = players.points[currentKey];

      if (currentValue > maxValue) {
        maxKeys = [parseInt(currentKey)];
        maxValue = currentValue;
      } else if (currentValue === maxValue) {
        maxKeys.push(parseInt(currentKey));
      }
    }
    players.winners = maxKeys;
  }
}

function populateOptions(selectId, min, max, selectedNum) {
  let selectElement = document.getElementById(selectId);

  // Clear existing options
  selectElement.innerHTML = '';

  //Generate options dynamically
  for (let i = min; i <= max; i++) {
    let option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    if (i == selectedNum) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  }
}

function startLocalGame() {
  clearElement('localGridContainer');
  clearElement('onlineGridContainer');
  let matchElement = document.getElementById('matchInfo');
  matchElement.style.display = 'none';

  let gameFormElement = document.getElementById("gameForm");
  gameFormElement.style.display = 'block';
  let onlineMenuElement = document.getElementById("onlineMenu");
  onlineMenuElement.style.display = 'block';

  rows = parseInt(document.getElementById('rows').value);
  columns = parseInt(document.getElementById('columns').value);
  playerCount = parseInt(document.getElementById('players').value);

  populateOptions('rows', 2, 10, rows);
  populateOptions('columns', 2, 10, columns);
  populateOptions('players', 2, 5, playerCount);

  matrix = buildMatrix(rows, columns);
  players = buildPlayers(playerCount);
  allMoves = buildMoves(matrix);
  createLocalGrid();
  displayScores('local', players);
}

startLocalGame();