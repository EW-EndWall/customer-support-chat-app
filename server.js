const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const users = {}; // * to store userIds and socket Ids
const groups = {}; // * Group name and list of users in this group

// * Send index.html file to client
app.use(express.static(path.join(__dirname, "public")));

// * Send active user list to all clients
const sendActiveUsers = () => {
  const activeUsers = Object.keys(users); // * Get all userIds
  io.emit("activeUsers", activeUsers);
};

// * Send group list to all clients
const sendGroups = () => {
  const activeGroups = Object.keys(groups); // * Get all groups
  io.emit("activeGroups", activeGroups);
};

io.on("connection", (socket) => {
  console.log("A user has connected:", socket.id);

  sendActiveUsers();
  sendGroups();

  // * We save the userId when the user logs in
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    socket.userId = userId; // * We add userId to the socket
    console.log(`User registered: ${userId} (socket id: ${socket.id})`);
    sendActiveUsers(); // * Update active users
  });

  // * Create a new group
  socket.on("createGroup", (groupName) => {
    if (!groups[groupName]) groups[groupName] = [];
    console.log(`Group created: ${groupName}`);
    sendGroups(); // * Update active groups
  });

  // * User joins a group
  socket.on("joinGroup", (groupName) => {
    if (groups[groupName]) {
      groups[groupName].push(socket.userId);
      socket.join(groupName); // * joins a group
      console.log(`${socket.userId} joined the group: ${groupName}`);
    }
  });

  // * Send private messages
  socket.on("privateMessage", ({ to, message }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit("privateMessage", {
        from: socket.userId,
        message,
      });
      console.log(`Private message sent: ${socket.userId} -> ${to}`);
    }
  });

  // * Send group messages
  socket.on("groupMessage", ({ groupName, message }) => {
    if (groups[groupName]) {
      // * Send message only to other members of the group
      socket.to(groupName).emit("groupMessage", {
        groupFrom: groupName,
        from: socket.userId,
        message,
      });
      console.log(`Group message sent: ${socket.userId} -> ${groupName}`);
    }
  });

  // * Remove user id when user leaves
  socket.on("disconnect", () => {
    if (socket.userId) {
      delete users[socket.userId];
      console.log(`User left: ${socket.userId}`);
      sendActiveUsers(); // * Update active users
    }
  });
});

server.listen(3000, () => {
  console.log("The server is running on port 3000");
});
