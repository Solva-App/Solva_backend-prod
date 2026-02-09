const { Schema } = require('json-validace')
const { OK } = require('http-status-codes')
const CustomError = require('../helpers/error')
const Submission = require('../models/Submission')
const Task = require('../models/Task')
const User = require("../models/User")
const firebase = require("./../helpers/firebase")
const { sendNotification } = require("../services/notification");

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

    const task = await Task.findOne({
      where: {
        id: req.body.taskId
      },
    })

    if (!task) {
      return next(CustomError.badRequest('Task with that id does not exist'))
    }

    if (task.usedSpots == task.totalSpots) {
      return next(CustomError.badRequest('The spots for the task has been filled'))
    }

    if (task.endDate < new Date()) {
      console.log(new Date())
      return next(CustomError.badRequest('End date for this task has passed'))
    }

    const hasSubmitted = await Submission.findOne({
      where: {
        taskId: req.params.taskId,
        userId: req.user.id
      }
    })

    if (hasSubmitted) {
      return next(CustomError.badRequest('You have already submitted for this task'))
    }

    const body = req.body

    const submission = await Submission.create({
      taskId: body.taskId,
      userId: req.user.id,
      link: body.link,
    })

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Submission created successfully',
      data: submission,
    })
  } catch (error) {
    return next({ error })
  }
}

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

    const earnings = (task.totalPool / task.totalSpots)
    user.balance += earnings
    await user.save()

    submission.status = "approved";
    await submission.save();

    await sendNotification({
      target: [submission.userId],
      title: "Task Submission",
      message: "Your task submission has been approved",
    });

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

    submission.status = "rejected";
    await submission.save();

    await sendNotification({
      target: [submission.userId],
      title: "Task Submission",
      message: "Your task submission has been rejected",
    });

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
