const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Assign player slot (P1 or P2)
    const playerKeys = Object.keys(players);
    const isP1 = playerKeys.length === 0;

    players[socket.id] = {
        id: socket.id,
        isP1: isP1,
        x: isP1 ? 50 : 90,
        y: 310,
        vx: 0,
        vy: 0,
        facingRight: true,
        color: isP1 ? '#06b6d4' : '#a855f7' // Blue for P1, Purple for P2
    };

    // Send initial state to new player
    socket.emit('init', { id: socket.id, players });
    
    // Notify everyone else about the new player
    socket.broadcast.emit('playerJoined', players[socket.id]);

    // Handle movement updates from phones
    socket.on('playerMove', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].facingRight = data.facingRight;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
