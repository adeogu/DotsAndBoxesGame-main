function createOnlineGrid(rows, columns) {
  const gridContainer = document.getElementById('onlineGridContainer');
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
          socket.emit('makeMove', {player: socket.id, row: row, col: col, direction: "horizontal"});
        });
      } else {
        // Make the horizontal line invisible for the last column
        horizontalLine.style.visibility = 'hidden';
      }

      if (row < rows) {
        verticalPath.addEventListener('click', () => {
          //console.log(`Clicked on Vertical Line: Row ${row + 1}, Column: ${col + 1}`);
          socket.emit('makeMove', {player: socket.id, row: row, col: col, direction: "vertical"});
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

socket.on('leftMatch', (data) => {
  console.log(data, 'left match');
  let playerLeftMatch = document.getElementById('playerLeftMatch');
  let playerLeftElement = document.createElement('div');
  playerLeftElement.classList.add('playerLeft');
  playerLeftElement.innerText = `Game Over - ${data.leftPlayer} left the match`;
  playerLeftMatch.appendChild(playerLeftElement);
});

socket.on('updateGame', (data) => {
  updateGrid(data.rowNum,data.columnNum,data.color,data.direction);
  if (data.completedCells.length != 0){
    fillCells(data.completedCells, data.color);
  }
  displayScores('online', data.liveLobby.gameState);
  if (data.liveLobby.gameState.winners.length != 0){
    displayLobbyInfo(data.liveLobby);
    displayRematchForm(data.liveLobby);
  }
});

socket.on('updateRematchForm', (data) => {
  displayRematchForm(data.liveLobby);
});

socket.on('allowCreateLobby', () => {
  document.getElementById("createLobby").disabled = false;
});

function leaveMatch() {
  socket.emit('leaveMatch', {playerId: socket.id})
  startLocalGame();
}

function displayLobbyInfo(liveLobby){
  let matchTableElement = document.getElementById("matchTable");

  // Clear the existing content
  matchTableElement.innerHTML = '';

  // Add Table Header Row
  let tableHeader = '<tr><th>Match</th>';
  for (let playerName of Object.values(liveLobby.members)){
    tableHeader += `<th>${playerName}</th>`;
  }
  tableHeader += '</tr>';
  matchTableElement.innerHTML += tableHeader;

  if (Object.keys(liveLobby.matchHistory).length === 0) {
    matchTableElement.innerHTML += `<tr><td colspan="5" style="text-align:center;">No Completed Games</td></tr>`;
  } else {
    // Add subsequent rows for each match
    for (let matchNum of Object.keys(liveLobby.matchHistory)) {
      let tableRow = ''
      tableRow += `<tr>`;
      tableRow += `<td>${matchNum}</td>`;
      for (let i = 1; i <= Object.keys(liveLobby.members).length; i++){
        if (liveLobby.matchHistory[matchNum].includes(i)){
          if (liveLobby.matchHistory[matchNum].length > 1){
            tableRow += `<td>Draw</td>`;
          }
          else{
            tableRow += `<td>Win</td>`;
          }
        }
        else{
          tableRow += `<td>Loss</td>`;
        }
      }
      tableRow += '</tr>';
      matchTableElement.innerHTML += tableRow;
    }
  }
}

function updateGrid(rowNum,columnNum,color,direction){
  let foundLine = findLineElement(rowNum, columnNum, direction);
  foundLine.classList.add('clicked-line');
  foundLine.style.backgroundColor = color;
  foundLine.style.opacity = 1;
}

function findLineElement(rowNum, columnNum, direction) {
  let rowElements = document.getElementsByClassName('row');
  let columnElements = rowElements[rowNum].getElementsByClassName('column');
  let foundColumn = columnElements[columnNum];
  let foundLineElement;
  if (direction == "horizontal"){
    foundLineElement = foundColumn.getElementsByClassName('horizontal-line')[0];
  }
  if (direction == "vertical"){
    foundLineElement = foundColumn.getElementsByClassName('vertical-line')[0];
  }
  return foundLineElement;
}

function displayRematchForm(liveLobby) {
  clearElement('rematchForm');
  let gameFormElement = document.getElementById('rematchForm');

  for (let playerId of Object.keys(liveLobby.rematch)) {
    let playerElement = document.createElement('div');
    playerElement.classList.add('rematchButton');

    // Create a checkbox element
    let checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `rematchCheckbox_${playerId}`;
    checkbox.checked = liveLobby.rematch[playerId];
    if (liveLobby.gameState.winners.length == 0){checkbox.disabled = true;}
    else{if(playerId !== socket.id){checkbox.disabled = true;}}

    // Add an event listener to the checkbox
    checkbox.addEventListener('change', () => {
      // Emit an event when the checkbox state changes
      socket.emit('updateRematchForm', {
        lobbyId: liveLobby.hostId,
        playerId: playerId,
        liveLobby: liveLobby
      });
    });

    // Create a label element for better accessibility
    let label = document.createElement('label');
    label.htmlFor = `rematchCheckbox_${playerId}`;
    label.textContent = liveLobby.members[playerId];

    // Append checkbox and label to playerElement
    playerElement.appendChild(label);
    playerElement.appendChild(checkbox);

    // Append playerElement to gameFormElement
    gameFormElement.appendChild(playerElement);
  }
}

socket.on('startGame', (data) => {
  clearElement('localGridContainer');
  clearElement('onlineGridContainer');
  let matchElement = document.getElementById('matchInfo');
  matchElement.style.display = 'block';

  let gameFormElement = document.getElementById("gameForm");
  gameFormElement.style.display = 'none';
  let onlineMenuElement = document.getElementById("onlineMenu");
  onlineMenuElement.style.display = 'none';
  createOnlineGrid(data.liveLobby.rows, data.liveLobby.columns);
  displayScores('online', data.liveLobby.gameState);
  displayRematchForm(data.liveLobby)
  displayLobbyInfo(data.liveLobby);
});