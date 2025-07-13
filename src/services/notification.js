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

  try {
    const socketMapping = await Socket.findOne({ where: { owner: target } });

    if (socketMapping?.socket && ioInstance) {
      ioInstance.to(socketMapping.socket).emit("notification", notification);
    } else {
      console.log(`User ${target} is offline — fallback active`);
    }
  } catch (err) {
    console.error("Socket fallback failed:", err);
  }

  return notification;
}

module.exports = {
  initNotificationIO,
  sendNotification,
};
