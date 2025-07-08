const CustomError = require('../helpers/error')
const { Schema } = require('json-validace')
const Notification = require('../models/Notification')
const { OK } = require('http-status-codes')
const Socket = require('../models/Socket')

module.exports.sendNotification = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: "string", required: true },
      message: { type: "string", required: true },
    });

    const result = schema.validate(req.body);
    if (result.errors && result.errors.length > 0) {
      return next(CustomError.badRequest("Invalid request body", result.errors));
    }

    const { user, body } = req;
    const { target, title, message } = body;
    const owner = user.id;

    const notification = await Notification.create({
      owner,
      title,
      message,
      isRead: false,
    });

    const socketMapping = await Socket.findOne({ where: { owner: target } });

    const io = req.app.get("io");
    io.to(socketMapping.socket).emit("notification", notification);

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Notification sent successfully",
      data: notification,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getUnreadNotifications = async function (req, res, next) {
  try {
    const { user } = req;
    const owner = user.id;

    const unread = await Notification.findAll({
      where: { owner, isRead: false },
      order: [["createdAt", "DESC"]],
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Unread notifications fetched successfully",
      data: unread,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getAllNotifications = async function (req, res, next) {
  try {
    const { user } = req;
    const owner = user.id;

    const notifications = await Notification.findAll({
      where: { owner },
      order: [["createdAt", "DESC"]],
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "All notifications fetched successfully",
      data: notifications,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.markNotificationAsRead = async function (req, res, next) {
  try {
    const { user } = req;
    const owner = user.id;

    const notification = await Notification.findOne({
      where: { id, owner },
    });

    if (!notification) {
      return next(CustomError.notFound("Notification not found"));
    }

    notification.isRead = true;
    await notification.save();

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.markAllAsRead = async function (req, res, next) {
  try {
    const { user } = req;
    const owner = user.id;

    const [updatedCount] = await Notification.update(
      { isRead: true },
      { where: { owner, isRead: false } }
    );

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: `${updatedCount} notifications marked as read`,
    });
  } catch (error) {
    return next({ error });
  }
};

