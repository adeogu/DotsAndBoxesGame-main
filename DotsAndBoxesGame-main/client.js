const socket = io();

socket.on('onlineCount', (data) => {
    let onlineCount = data.count;
    let onlineCountElement = document.getElementById("onlineCount");
    onlineCountElement.textContent = `Online: ${onlineCount}`;
});

document.getElementById('createLobby').addEventListener("click", function () {
    playerName = document.getElementById("displayName").value;
    if (playerName == null || playerName == '') {
        alert("Please enter a name to start a lobby.");
    }
    else {
        rows = parseInt(document.getElementById('rows').value);
        columns = parseInt(document.getElementById('columns').value);
        playerCount = parseInt(document.getElementById('players').value);
        socket.emit("addLobby", {hostId: socket.id, hostName: playerName, rows: rows, columns: columns, playerCount: playerCount, members:{}});
        document.getElementById("createLobby").disabled = true;
    }
});

document.getElementById('toggleLobbiesTable').addEventListener('change', function () {
    let tableElement = document.getElementById("lobbiesTable");
    if (this.checked) {
        tableElement.style.display = 'table';
    } else {
        tableElement.style.display = 'none';
    }
});

socket.on('updateLobbies', (data) => {
    let tableElement = document.getElementById("lobbiesTable");
    let lobbiesElement = document.getElementById("lobbies");

    // Clear the existing content
    tableElement.innerHTML = '';
    tableElement.innerHTML = '<tr><th>Host</th><th>Rows</th><th>Columns</th><th>Players</th><th>Action</th></tr>';

    if (Object.keys(data.lobbies).length === 0) {
        tableElement.innerHTML += `<tr><td colspan="5" style="text-align:center;">No Active Lobbies</td></tr>`;
    } else {
        for (let lobby of Object.values(data.lobbies)) {
            let actionButton;
            
            if (lobby.hostId === socket.id) {
                actionButton = '<button onclick="cancelLobby()">Cancel</button>';
            } else {
                // Check if the player is already in the lobby
                if (lobby.members[socket.id]) {
                    actionButton = '<button onclick="leaveLobby()">Leave</button>';
                } else {
                    // Disable the join button if the lobby is full
                    if (Object.keys(lobby.members).length >= lobby.playerCount) {
                        actionButton = '<button disabled>Join</button>';
                    } else {
                        actionButton = `<button onclick="joinLobby('${lobby.hostId}')">Join</button>`;
                    }
                }
            }

            tableElement.innerHTML += `<tr><td>${lobby.hostName}</td><td>${lobby.rows}</td><td>${lobby.columns}</td><td>${Object.keys(lobby.members).length}/${lobby.playerCount}</td><td>${actionButton}</td></tr>`;
        }
    }

    // Append the table to the lobbies element
    lobbiesElement.appendChild(tableElement);
});

function cancelLobby() {
    socket.emit("removeLobby", {hostId: socket.id});
    document.getElementById("createLobby").disabled = false;
}

function joinLobby(hostId) {
    playerName = document.getElementById("displayName").value;
    if (playerName == null || playerName == '') {
        alert("Please enter a name to join a lobby.");
    }
    else {
        socket.emit("joinLobby", {memberId: socket.id, name: playerName, hostId: hostId});
    }
}

function leaveLobby() {
    socket.emit("leaveLobby", { memberId: socket.id });
}