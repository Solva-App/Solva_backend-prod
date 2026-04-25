const { Schema } = require('json-validace')
const { OK } = require('http-status-codes')
const CustomError = require('../helpers/error')
const Submission = require('../models/Submission')
const Task = require('../models/Task')
const User = require("../models/User")
const firebase = require("./../helpers/firebase")
const { sendNotification } = require("../services/notification");
const { sendEmail } = require("../helpers/resend");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const { Op } = require('sequelize');

module.exports.createSubmission = async function (req, res, next) {
  try {
    const schema = new Schema({
      taskId: { type: 'string', required: true },
      link: { type: 'string', required: true }
    })

    const result = schema.validate(req.body)

    if (result.error) {
      return next(
        CustomError.badRequest('Invalid request body', result.error)
      )
    }

    const { taskId, link } = req.body
    const userId = req.user.id

    const task = await Task.findByPk(taskId)

    if (!task) {
      return next(CustomError.badRequest('Task with that id does not exist'))
    }

    if (task.endDate < new Date()) {
      return next(CustomError.badRequest('End date for this task has passed'))
    }

    const activeSubmission = await Submission.findOne({
      where: {
        taskId,
        userId,
        status: { [Op.or]: ['pending', 'approved'] }
      }
    });

    if (!activeSubmission) {
      if (task.usedSpots >= task.totalSpots) {
        return next(CustomError.badRequest('Task spots are filled'));
      }
      await task.increment('usedSpots', { by: 1 });
    }

    const submission = await Submission.create({ taskId, userId, link, status: "pending" });

    res.status(OK).json({
      success: true,
      message: activeSubmission ? 'Additional link added' : 'Submission created',
      data: submission,
    });
  } catch (error) {
    return next({ error });
  }
};

module.exports.getTaskSubmissions = async function (req, res, next) {
  try {
    const submissions = await Submission.findAll({
      where: {
        taskId: req.params.taskId
      }
    })

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Task Submissions fetched successfully',
      data: submissions,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.approveSubmission = async function (req, res, next) {
  try {
    const submission = await Submission.findOne({
      where: {
        id: req.params.id,
        status: "pending"
      },
    });
    if (!submission) {
      return next(CustomError.badRequest('Submission with that id does not exist or has already been approved or rejected'))
    }

    const user = await User.findByPk(submission.userId)
    if (!user) {
      return next(CustomError.badRequest('No user found with this submission'))
    }

    const task = await Task.findOne({
      where: {
        id: submission.taskId
      }
    })
    if (!task) {
      return next(CustomError.badRequest('No task found with this submission'))
    }

    const alreadyPaid = await Submission.findOne({
      where: { userId: user.id, taskId: task.id, status: 'approved', isPaid: true }
    });

    if (!alreadyPaid) {
      const paymentAmount = task.totalPool / task.totalSpots;

      await user.increment('balance', { by: paymentAmount });
      submission.isPaid = true;
    }

    submission.status = "approved";
    await submission.save();

    // await sendNotification({
    //   target: [submission.userId],
    //   title: "Task Submission",
    //   message: "Your task submission has been approved",
    // });

    const templatePath = path.join(
      __dirname,
      "../templates/default_email.handlebars",
    );

    const defaultContent = fs.readFileSync(templatePath, "utf8");

    const compileTemplate = handlebars.compile(defaultContent);

    const template = compileTemplate({
      fullName: user.fullName,
      email: user.email,
      message: "Your task submission has been approved",
    });

    await sendEmail(user.email, "Task Submission", template);

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Submission approved successfully.",
      data: submission,
    });
  } catch (error) {
    return next({ error })
  }
}

module.exports.rejectSubmission = async function (req, res, next) {
  try {
    const submission = await Submission.findOne({
      where: {
        id: req.params.id,
        status: "pending"
      },
    });

    if (!submission) {
      return next(CustomError.badRequest('Submission with that id does not exist or has already been approved or rejected'))
    }

    const user = await User.findByPk(submission.userId)
    if (!user) {
      return next(CustomError.badRequest('No user found with this submission'))
    }

    const task = await Task.findOne({
      where: {
        id: submission.taskId
      }
    })
    if (!task) {
      return next(CustomError.badRequest('No task found with this submission'))
    }

    submission.status = "rejected";
    await submission.save();

    const otherActiveSubmissions = await Submission.count({
      where: {
        userId: submission.userId,
        taskId: submission.taskId,
        status: { [Op.or]: ['pending', 'approved'] }
      }
    });

    if (otherActiveSubmissions === 0) {
      await task.decrement('usedSpots', { by: 1 });
    }

    // await sendNotification({
    //   target: [submission.userId],
    //   title: "Task Submission",
    //   message: "Your task submission has been rejected",
    // });

    const templatePath = path.join(
      __dirname,
      "../templates/default_email.handlebars",
    );

    const defaultContent = fs.readFileSync(templatePath, "utf8");

    const compileTemplate = handlebars.compile(defaultContent);

    const template = compileTemplate({
      fullName: user.fullName,
      email: user.email,
      message: "Your task submission has been rejected",
    });

    await sendEmail(user.email, "Task Submission", template);

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: "Submission rejected successfully.",
      data: submission,
    });
  } catch (error) {
    return next({ error })
  }
}

module.exports.deleteSubmission = async function (req, res, next) {
  try {
    const submission = await Submission.findByPk(req.params.id)
    if (!submission) {
      return next(CustomError.badRequest('Submission with that id does not exist'))
    }

    await submission.destroy()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Submission deleted successfully',
      data: submission,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getSubmission = async function (req, res, next) {
  try {
    const submission = await Submission.findByPk(req.params.id)
    if (!submission) {
      return next(CustomError.badRequest('Invalid submission id'))
    }
    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Submission fetched successfully',
      data: submission,
    })
  } catch (error) {
    return next({ error })
  }
}