const CustomError = require('../helpers/error')
const { Schema } = require('json-validace')
const Notification = require('../models/Notification')
const { OK } = require('http-status-codes')
const { Op, literal } = require('sequelize')
const Socket = require('../models/Socket')
const { sendNotification } = require("../services/notification");
const User = require('../models/User')

module.exports.sendNotification = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: "string", required: true },
      message: { type: "string", required: true },
      target: { type: "array", required: true },
    });

    const result = schema.validate(req.body);
    if (result.errors && result.errors.length > 0) {
      return next(CustomError.badRequest("Invalid request body", result.errors));
    }

    const { user, body } = req;
    const { title, message, target } = body;

    const notification = await sendNotification({ target, title, message });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Notification sent successfully",
      data: {
        title: notification.title,
        message: notification.message,
      },
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getUserUnreadNotifications = async function (req, res, next) {
  try {
    const { user } = req;
    const owner = user.id;

    const unread = await Notification.findAll({
      where: literal(`
        JSON_CONTAINS(owner, '${owner}', '$')
        AND NOT JSON_CONTAINS(readBy, '${owner}', '$')
      `),
      order: [['createdAt', 'DESC']]
    });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Unread notifications fetched successfully',
      data: unread
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return next({ error });
  }
};

module.exports.getAllUserNotifications = async function (req, res, next) {
  try {
    const { user } = req;
    const owner = user.id;

    const notifications = await Notification.findAll({
      where: {
        owner: { [Op.substring]: [owner] },
      },
      order: [['createdAt', 'DESC']],
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
    const { id } = req.params;

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (!notification.owner.includes(owner)) {
      return res.status(403).json({ error: 'You are not the owner of this notification' });
    }

    let readBy = JSON.parse(notification.readBy || "[]");

    if (!readBy.includes(owner)) {
      readBy.push(owner);
    }

    await notification.update({ readBy: readBy });

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return next({ error });
  }
};

module.exports.markAllUserNotificationsAsRead = async (req, res, next) => {
  try {
    const { user } = req;
    const owner = user.id;

    const notifications = await Notification.findAll({
      where: {
        owner: { [Op.substring]: [owner] }
      },
    });

    if (!notifications.length) {
      return res.status(200).json({
        success: true,
        status: res.statusCode,
        message: 'No notifications to mark as read',
      });
    }

    let updatedCount = 0;

    for (const notification of notifications) {
      let readBy = JSON.parse(notification.readBy || '[]');

      if (!readBy.includes(owner)) {
        readBy.push(owner);
        await notification.update({ readBy: readBy });
        updatedCount++;
      }
    }

    res.status(200).json({
      success: true,
      status: res.statusCode,
      message: `${updatedCount} notification(s) marked as read`,
    });
  } catch (error) {
    return next({
      status: 500,
      message: 'Failed to mark notifications as read',
      error: error.message,
    });
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

    const userIds = (await User.findAll({
      attributes: ["id"],
      where: {
        role: {
          [Op.not]: "admin",
        },
      },
    })).map(user => user.id);


    sendNotification({
      target: userIds,
      title,
      message,
    })

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
