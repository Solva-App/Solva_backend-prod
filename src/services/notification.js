const Notification = require("../models/Notification");
const Socket = require("../models/Socket");

let ioInstance = null;

function initNotificationIO(io) {
  ioInstance = io;
}

async function sendNotification({ target, title, message }) {
  return Notification.create({
    owner: target,
    title,
    message,
    isRead: false,
  }).then(async (notification) => {
    const sockets = await Socket.findAll({
      where: {
        owner: {
          [Op.in]: target,
        },
      },
    });

    if (ioInstance) {
      sockets.forEach((socket) => {
        ioInstance.to(socket.socket).emit("notification", notification);
      });
    }
    return notification;
  });
}

module.exports = {
  initNotificationIO,
  sendNotification,
};
