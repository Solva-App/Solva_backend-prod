const { socketAuth } = require("../middlewares/auth");

module.exports = function setupSocket(io) {
  io.use(socketAuth);

  io.on("connection", (socket) => {
    const socketId = socket.id;
    const userId = socket.user?.id;

    socket.join(socketId.toString());
    console.log(`User ${userId} connected on Socket ID: ${socketId}`);

    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected from Socket ID: ${socketId}`);
    });
  });
};
