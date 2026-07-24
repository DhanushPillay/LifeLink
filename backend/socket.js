const jwt = require("jsonwebtoken");
const Message = require("./models/Message");

let io;
const onlineUsers = new Map();

function initSocket(server) {
  // ponytail: Socket.IO disabled - frontend uses SSE via sse.js.
  // Kept as reference if Socket.IO is needed in future.
  console.log("Socket.IO init skipped — using SSE transport");
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

function isUserOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

function emitToUser(userId, event, data) {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit(event, data);
    }
  }
}

function emitToAll(event, data) {
  if (io) io.emit(event, data);
}

module.exports = { initSocket, getIO, isUserOnline, emitToUser, emitToAll };
