const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 8000;

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Store rooms and their users: { roomId: Map(socketId -> userInfo) }
const rooms = new Map();

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle user joining a room
    socket.on("join-room", (data) => {
        const { roomId, username, color } = data;
        
        console.log(`User ${username} joining room: ${roomId}`);
        
        // Join the socket.io room
        socket.join(roomId);
        
        // Store room ID on socket for later reference
        socket.roomId = roomId;
        
        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
        }
        
        // Add user to room
        const roomUsers = rooms.get(roomId);
        roomUsers.set(socket.id, {
            id: socket.id,
            username: username,
            color: color
        });
        
        console.log(`Room ${roomId} now has ${roomUsers.size} users`);
        
        // Send confirmation to user
        socket.emit("room-joined", {
            roomId: roomId,
            id: socket.id,
            username: username,
            color: color
        });
        
        // Broadcast updated user list to everyone in the room
        io.to(roomId).emit("users-update", Array.from(roomUsers.values()));
    });

    socket.on("send-location", (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        const roomUsers = rooms.get(roomId);
        if (roomUsers) {
            const userInfo = roomUsers.get(socket.id);
            if (userInfo) {
                const locationData = {
                    id: socket.id,
                    username: userInfo.username,
                    color: userInfo.color,
                    ...data
                };
                // Send location only to users in the same room
                io.to(roomId).emit("receive-location", locationData);
            }
        }
    });

    socket.on("disconnect", () => {
        console.log("user-disconnected:", socket.id);
        
        const roomId = socket.roomId;
        if (roomId && rooms.has(roomId)) {
            const roomUsers = rooms.get(roomId);
            roomUsers.delete(socket.id);
            
            // Notify room about disconnection
            io.to(roomId).emit("user-disconnected", socket.id);
            
            // Send updated user list to room
            io.to(roomId).emit("users-update", Array.from(roomUsers.values()));
            
            // Clean up empty rooms
            if (roomUsers.size === 0) {
                rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (empty)`);
            }
        }
    });
});

app.get("/", (req, res) => {
    res.render("index", { roomId: null });
});

app.get("/room/:roomId", (req, res) => {
    res.render("index", { roomId: req.params.roomId });
});

server.listen(PORT, () => {
    console.log("Server started on PORT", PORT);
});
