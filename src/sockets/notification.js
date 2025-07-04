const { socketAuth } = require("../middlewares/auth");

module.exports = function setupNotificationSocket(io) {
  io.use(socketAuth);

  io.on("connection", (socket) => {
    const socketId = socket.id;
    socket.join(socketId.toString());
    console.log(`User ${socketId} connected`);

    socket.on("disconnect", () => {
      console.log(`User ${socketId} disconnected`);
    });
  });
};
