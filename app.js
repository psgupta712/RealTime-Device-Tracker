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
        
        // Store room ID and username on socket
        socket.roomId = roomId;
        socket.username = username;
        
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
        
        // Broadcast updated user list
        io.to(roomId).emit("users-update", Array.from(roomUsers.values()));
        
        // Notify room about new user
        socket.to(roomId).emit("user-joined-room", {
            userId: socket.id,
            username: username
        });
    });

    // Handle location updates
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

    // Handle status updates
    socket.on("set-status", (data) => {
        const roomId = socket.roomId;
        const username = socket.username;
        if (!roomId) return;
        
        socket.to(roomId).emit("user-status-updated", {
            userId: socket.id,
            username: username,
            ...data
        });
    });

    socket.on("clear-status", () => {
        const roomId = socket.roomId;
        const username = socket.username;
        if (!roomId) return;
        
        socket.to(roomId).emit("user-status-updated", {
            userId: socket.id,
            username: username,
            statusId: null
        });
    });

    // Handle meeting point
    socket.on("set-meeting-point", (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        socket.to(roomId).emit("meeting-point-set", data);
    });

    socket.on("remove-meeting-point", () => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        socket.to(roomId).emit("meeting-point-removed");
    });

    // Handle geofence
    socket.on("create-geofence", (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        socket.to(roomId).emit("geofence-created", data);
    });

    socket.on("remove-geofence", (geofenceId) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        socket.to(roomId).emit("geofence-removed", geofenceId);
    });

    // Handle battery updates
    socket.on("update-battery", (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        socket.to(roomId).emit("user-battery-updated", {
            userId: socket.id,
            ...data
        });
    });

    // Handle ping for connection status
    socket.on("ping", () => {
        socket.emit("pong");
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("user-disconnected:", socket.id);
        
        const roomId = socket.roomId;
        const username = socket.username;
        
        if (roomId && rooms.has(roomId)) {
            const roomUsers = rooms.get(roomId);
            roomUsers.delete(socket.id);
            
            // Notify room about disconnection
            io.to(roomId).emit("user-disconnected", socket.id);
            
            // Notify about user leaving
            io.to(roomId).emit("user-left-room", {
                userId: socket.id,
                username: username
            });
            
            // Send updated user list
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
