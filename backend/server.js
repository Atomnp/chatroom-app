const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database("./chat.db");

db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, username TEXT, message TEXT, userId TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"
  );
});

// Initialize rooms object
const rooms = {};

// WebSocket connection handling
wss.on("connection", (ws) => {
  let currentRoom = null;
  let username = null;
  let userId = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "join":
          currentRoom = data.room;
          username = data.username;
          ws.username = username;

          userId = data.userId;

          ws.userId = userId;

          if (!rooms[currentRoom]) {
            rooms[currentRoom] = new Set();
          }

          rooms[currentRoom].add(ws);
          broadcastToRoom(
            currentRoom,
            JSON.stringify({ type: "userJoined", username })
          );
          sendUserList(currentRoom);
          break;

        case "leave":
          if (currentRoom) {
            rooms[currentRoom].delete(ws);
            broadcastToRoom(
              currentRoom,
              JSON.stringify({ type: "userLeft", username })
            );
            sendUserList(currentRoom);
            currentRoom = null;
            username = null;
          }
          break;

        case "message":
          if (currentRoom) {
            const messageData = {
              type: "message",
              username,
              userId,
              message: data.message,
            };
            broadcastToRoom(currentRoom, JSON.stringify(messageData));
            saveMessageToDb(currentRoom, username, data.message, userId);
          }
          break;
        case "typing":
          if (currentRoom) {
            const typingData = {
              type: "typing",
              typing: data.isTyping,
              username,
            };
            broadcastToRoom(currentRoom, JSON.stringify(typingData), ws.userId);
          }
          break;

        default:
          console.error("Unknown message type");
      }
    } catch (error) {
      console.error("Error parsing message:", error);
      ws.send(
        JSON.stringify({ type: "error", message: "Invalid message format" })
      );
    }
  });

  ws.on("close", () => {
    if (currentRoom) {
      const leavingUser = username;
      const leavingRoom = currentRoom;
      rooms[leavingRoom].delete(ws);
      broadcastToRoom(
        leavingRoom,
        JSON.stringify({ type: "userLeft", username: leavingUser })
      );
      sendUserList(leavingRoom);
    }
  });
});

function broadcastToRoom(room, message, ignoreUser = null) {
  rooms[room].forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userId !== ignoreUser) {
      client.send(message);
    }
  });
}

function sendUserList(room) {
  const users = Array.from(rooms[room]).map((client) => client.username); // Retrieve usernames from clients
  broadcastToRoom(room, JSON.stringify({ type: "userList", users }));
}

function saveMessageToDb(room, user, message, userId) {
  db.run(
    "INSERT INTO messages (room, username, message, userId) VALUES (?, ?, ?, ?)",
    [room, user, message, userId]
  );
}

// API to retrieve the last 50 messages of a specific room
app.get("/api/messages/:room", (req, res) => {
  const { room } = req.params;
  db.all(
    "SELECT * FROM messages WHERE room = ? ORDER BY timestamp DESC LIMIT 50",
    [room],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows.reverse()); // Reverse the rows so the latest message comes last
    }
  );
});

// app.get("/api/get_user_id/", (req, res) => {
//   res.json({ userId: Math.random().toString(36).substr(2, 9) });
// });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
