const Notification = require("../models/Notification");
const Socket = require("../models/Socket");

let ioInstance = null;

function initNotificationIO(io) {
  ioInstance = io;
}

async function sendNotification({ target, title, message }) {
  try {
    if (!Array.isArray(target) || target.length === 0) {
      throw new Error("Target must be a non-empty array of user IDs");
    }
    if (!title || !message) {
      throw new Error("Title and message are required for notifications");
    }

    const notification = await Notification.create({
      owner: target,
      title,
      message,
      readBy: [],
    });

    for (const userId of target) {
      const socketMapping = await Socket.findOne({ where: { owner: userId } });

      if (socketMapping?.socket && ioInstance) {
        ioInstance.to(socketMapping.socket).emit("notification", {
          id: notification.id,
          title: notification.title,
          message: notification.message,
        });
        console.log(`Notification sent to user ${userId}`);
      } else {
        console.warn(`No active socket for user ${userId}`);
      }
    }

    return notification;
  } catch (error) {
    console.error("Error sending notification:", error.message);
    throw error;
  }
}

module.exports = {
  initNotificationIO,
  sendNotification,
};
