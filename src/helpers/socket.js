const { socketAuth } = require("../middlewares/auth");
const Socket = require("../models/Socket")

module.exports = function setupSocket(io) {
  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const userId = socket.user?.id;
    const socketId = socket.id;

    try {
      if (userId) {
        await Socket.upsert({ owner: userId, socket: socketId });
      }

      socket.join(socketId);

      socket.on("disconnect", async () => {
        await Socket.destroy({ where: { owner: userId } });
      });
    } catch (error) {
      console.error("Socket DB error:", error.message);
    }
  });
};

