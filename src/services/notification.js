const Notification = require("../models/Notification");
const Socket = require("../models/Socket");

let ioInstance = null;

function initNotificationIO(io) {
  ioInstance = io;
}

async function sendNotification({ target, title, message }) {
  const notification = await Notification.create({
    owner: target,
    title,
    message,
    isRead: false,
  });

    const socketMapping = await Socket.findOne({ where: { owner: target } });
     ioInstance.to(socketMapping.socket).emit("notification", notification);

  return notification;
}

module.exports = {
  initNotificationIO,
  sendNotification,
};
