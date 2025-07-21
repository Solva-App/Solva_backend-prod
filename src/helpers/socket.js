const { socketAuth } = require("../middlewares/auth");
const Socket = require("../models/Socket");

module.exports = function setupSocket(io) {
  (async () => {
    try {
      await Socket.destroy({ where: {} });
      console.log("Cleared all stale socket records on server startup.");
    } catch (err) {
      console.error("Failed to clear socket table on startup:", err.message);
    }
  })();

  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const userId = socket.user?.id;
    const socketId = socket.id;

    console.log(`User connected: ${userId}, Socket ID: ${socketId}`);

    try {
      if (userId) {
        await Socket.upsert({ owner: userId, socket: socketId });
        socket.join(socketId); // optional: only needed if you're using room features
      }

      // Handle disconnection
      socket.on("disconnect", async () => {
        try {
          await Socket.destroy({ where: { owner: userId } });
          console.log(`User disconnected: ${userId}, Socket ID: ${socketId}`);
        } catch (err) {
          console.error("Error removing socket on disconnect:", err.message);
        }
      });

    } catch (error) {
      console.error("Socket DB error during connection:", error.message);
    }
  });
};
