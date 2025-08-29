const CustomError = require('../helpers/error')
const { Schema } = require('json-validace')
const Notification = require('../models/Notification')
const { OK } = require('http-status-codes')
const { Op } = require('sequelize')
const Socket = require('../models/Socket')
const { sendNotification } = require("../services/notification");
const User = require('../models/User')

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
    const { title, message } = body;

    const notification = await sendNotification({
      target: [user.id],
      title,
      message,
    });

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

    const id = req.params.id;

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

module.exports.broadcast = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: "string", required: true },
      message: { type: "string", required: true },
    });

    const result = schema.validate(req.body);
    if (result.errors && result.errors.length > 0) {
      return next(CustomError.badRequest("Invalid request body", result.errors));
    }

    const { title, message } = req.body;

    // Get all non-admin user IDs only
    const users = await User.findAll({
      attributes: ["id"],
      where: {
        role: {
          [Op.not]: "admin",
        },
      },
    });

    // Use Promise.all to send notifications in parallel
    await Promise.all(
      users.map((user) =>
        sendNotification({
          target: user.id,
          title,
          message,
        })
      )
    );

    res.status(OK).json({
      success: true,
      message: "Broadcast notification sent to all non-admin users",
    });
  } catch (error) {
    console.error("Broadcast failed:", error);
    next(error);
  }
};

module.exports.getAllNotifications = async function (req, res, next) {
  try {
    const notifications = await Notification.findAll({
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

module.exports.editNotification = async function (req, res, next) {
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
    const { title, message } = body;

    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return next(CustomError.notFound("Notification not found"));
    }

    notification.title = title;
    notification.message = message;
    await notification.save();

    res.status(OK).json({
      success: true,
      message: "Notification updated",
    });
  } catch (error) {
    console.error("Edit notification failed:", error);
    next(error);
  }
};

module.exports.deleteNotification = async function (req, res, next) {
  const { id } = req.params;
  try {
    const notification = await Notification.findByPk(id);
    if (!notification) {
      return next(CustomError.notFound("Notification not found"));
    }

    await notification.destroy();

    res.status(OK).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Delete notification failed:", error);
    next(error);
  }
};
