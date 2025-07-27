const { socketAuth } = require("../middlewares/auth");
const Socket = require("../models/Socket");

module.exports = function setupSocket(io) {
  // (async () => {
  //   try {
  //     await Socket.destroy({ where: {} });
  //     console.log("Cleared all stale socket records on server startup.");
  //   } catch (err) {
  //     console.error("Failed to clear socket table on startup:", err.message);
  //   }
  // })();

  io.use(socketAuth);

  io.on("connection", async (socket) => {
  const userId = socket.user?.id;
  const socketId = socket.id;

  if (!userId) {
    console.warn(`Unauthenticated socket connected: ${socketId}`);
    return socket.disconnect(true);
  }

  try {
    if (userId) {
      const existingSocket = await Socket.findOne({ where: { owner: userId } });

      if (existingSocket && existingSocket.socket !== socketId) {
        const oldSocket = io.sockets.sockets.get(existingSocket.socket);
        if (oldSocket) {
          oldSocket.disconnect();
          console.log(`Duplicate socket for user ${userId} disconnected.`);
        }
        await Socket.destroy({ where: { owner: userId } });
      }
      await Socket.upsert({ owner: userId, socket: socketId });
      console.log(`User connected: ${userId}, Socket ID: ${socketId}`);
      // socket.join(socketId);
    }

    socket.on("disconnect", async () => {
      try {
        const currentMapping = await Socket.findOne({ where: { owner: userId } });
        if (currentMapping?.socket === socketId) {
          await Socket.destroy({ where: { owner: userId } });
          console.log(`User disconnected: ${userId}, Socket ID: ${socketId}`);
        }
      } catch (err) {
        console.error("Error during disconnect cleanup:", err.message);
      }
    });

    socket.on("chatReply", async (data) => {
      // 🚫 Prevent emit if not connected
      if (socket.connected) {
        io.to(socketId).emit("chatReply", data);
      } else {
        console.log("Socket is not connected. chatReply not sent.");
      }
    });

  } catch (error) {
    console.error("Socket DB error during connection:", error.message);
  }
});

};
