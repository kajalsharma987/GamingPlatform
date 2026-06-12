let ioInstance = null;

function initSockets(server) {
  try {
    const { Server } = require("socket.io");
    ioInstance = new Server(server, {
      cors: { origin: process.env.CLIENT_ORIGIN || "*" }
    });

    ioInstance.on("connection", (socket) => {
      socket.on("match:join", (matchId) => socket.join(`match:${matchId}`));
      socket.on("match:leave", (matchId) => socket.leave(`match:${matchId}`));
    });
  } catch (err) {
    console.log("Socket.IO disabled:", err.message);
  }

  return ioInstance;
}

function emitEvent(event, payload, room = null) {
  if (!ioInstance) return;
  if (room) {
    ioInstance.to(room).emit(event, payload);
    return;
  }
  ioInstance.emit(event, payload);
}

module.exports = {
  initSockets,
  emitEvent
};
