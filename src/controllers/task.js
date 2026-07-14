const { sequelize } = require('../database/db')
const { Schema } = require('json-validace')
const { OK } = require('http-status-codes')
const CustomError = require('../helpers/error')
const User = require('../models/User')
const Task = require('../models/Task')
const Submission = require('../models/Submission')
const firebase = require("./../helpers/firebase")
const { sendEmail } = require("../helpers/resend");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

module.exports.createTask = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: 'string', required: true },
      overview: { type: 'string', required: true },
      type: { type: 'string', required: true },
      sponsorName: { type: 'string', required: true },
      sponsorLogo: { type: 'string', required: false },
      bannerImage: { type: 'string', required: false },
      requirements: { type: 'array', required: true },
      guidelines: { type: 'array', required: true },
      selectionCriteria: { type: 'array', required: true },
      howToSubmit: { type: 'array', required: true },
      startDate: { type: 'string', format: 'date-time', required: true },
      endDate: { type: 'string', format: 'date-time', required: true },
      totalPool: { type: 'number', required: true },
      totalSpots: { type: 'number', required: true },
    })

    const sanitizedBody = { ...req.body }

    const numberFields = ['totalPool', 'totalSpots']
    numberFields.forEach(field => {
      if (sanitizedBody[field] !== undefined && sanitizedBody[field] !== '') {
        sanitizedBody[field] = Number(sanitizedBody[field])
      }
    })

    const arrayFields = ['requirements', 'guidelines', 'selectionCriteria', 'howToSubmit']
    arrayFields.forEach(field => {
      if (typeof sanitizedBody[field] === 'string') {
        try {
          let cleanStr = sanitizedBody[field].trim()
          cleanStr = cleanStr.replace(/'/g, '"')
          sanitizedBody[field] = JSON.parse(cleanStr)
        } catch (e) {
          sanitizedBody[field] = sanitizedBody[field].split(',').map(item => item.trim())
        }
      }
    })

    const result = schema.validate(sanitizedBody)

    if (result.error) {
      return next(
        CustomError.badRequest('Invalid request body', result.error)
      )
    }

    if (new Date(sanitizedBody.startDate) >= new Date(sanitizedBody.endDate)) {
      return next(
        CustomError.badRequest('Start date must be before end date')
      )
    }

    let sponsorLogo = null
    let bannerImage = null

    if (req.files?.sponsorLogo?.length) {
      const file = req.files.sponsorLogo[0]
      const upload = await firebase.fileUpload(file, 'tasks')
      if (upload instanceof CustomError) {
        return next(upload);
      }
      sponsorLogo = upload
    }

    if (req.files?.bannerImage?.length) {
      const file = req.files.bannerImage[0]
      const upload = await firebase.fileUpload(file, 'tasks')
      if (upload instanceof CustomError) {
        return next(upload)
      }
      bannerImage = upload
    }

    const task = await Task.create({
      owner: req.user.id,
      ...sanitizedBody,
      sponsorLogo,
      bannerImage,
    })

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Task created successfully',
      data: task,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getTasks = async function (req, res, next) {
  try {
    const tasks = await Task.findAll()

    const parsedTasks = tasks.map(task => {
      const taskObj = task.toJSON ? task.toJSON() : task
      const arrayFields = ['requirements', 'guidelines', 'selectionCriteria', 'howToSubmit']
      arrayFields.forEach(field => {
        if (typeof taskObj[field] === 'string') {
          try {
            taskObj[field] = JSON.parse(taskObj[field])
          } catch (e) {
          }
        }
      })
      return taskObj
    })

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Task fetched successfully',
      data: parsedTasks,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.updateTask = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: 'string', required: false },
      overview: { type: 'string', required: false },
      type: { type: 'string', required: false },
      sponsorName: { type: 'string', required: false },
      sponsorLogo: { type: 'string', required: false },
      bannerImage: { type: 'string', required: false },
      requirements: { type: 'array', required: false },
      guidelines: { type: 'array', required: false },
      selectionCriteria: { type: 'array', required: false },
      howToSubmit: { type: 'array', required: false },
      startDate: { type: 'string', format: 'date-time', required: false },
      endDate: { type: 'string', format: 'date-time', required: false },
      totalPool: { type: 'number', required: false },
      totalSpots: { type: 'number', required: false },
    })

    const sanitizedBody = { ...req.body }

    const numberFields = ['totalPool', 'totalSpots']
    numberFields.forEach(field => {
      if (sanitizedBody[field] !== undefined && sanitizedBody[field] !== '') {
        sanitizedBody[field] = Number(sanitizedBody[field])
      }
    })

    const arrayFields = ['requirements', 'guidelines', 'selectionCriteria', 'howToSubmit']
    arrayFields.forEach(field => {
      if (typeof sanitizedBody[field] === 'string') {
        try {
          let cleanStr = sanitizedBody[field].trim()
          // Fixes standard single quote arrays "[ 'item1', 'item2' ]" -> '["item1", "item2"]'
          cleanStr = cleanStr.replace(/'/g, '"')
          sanitizedBody[field] = JSON.parse(cleanStr)
        } catch (e) {
          // Fallback if it's sent as a standard comma-separated text list
          sanitizedBody[field] = sanitizedBody[field].split(',').map(item => item.trim())
        }
      }
    })

    const result = schema.validate(sanitizedBody)

    if (result.error) {
      return next(
        CustomError.badRequest('Invalid request body', result.error)
      )
    }

    const task = await Task.findByPk(req.params.id)

    if (!task) {
      return next(CustomError.badRequest('Task with that id does not exist'))
    }

    const finalStartDate = sanitizedBody.startDate ? new Date(sanitizedBody.startDate) : new Date(task.startDate)
    const finalEndDate = sanitizedBody.endDate ? new Date(sanitizedBody.endDate) : new Date(task.endDate)

    if (finalStartDate >= finalEndDate) {
      return next(
        CustomError.badRequest('Start date must be before end date')
      )
    }

    let sponsorLogo = null
    let bannerImage = null

    if (req.files?.sponsorLogo?.length) {
      const file = req.files.sponsorLogo[0]
      const upload = await firebase.fileUpload(file, 'tasks')
      if (upload instanceof CustomError) {
        return next(upload);
      }
      sponsorLogo = upload
    }

    if (req.files?.bannerImage?.length) {
      const file = req.files.bannerImage[0]
      const upload = await firebase.fileUpload(file, 'tasks')
      if (upload instanceof CustomError) {
        return next(upload)
      }
      bannerImage = upload
    }

    Object.keys(sanitizedBody).forEach((key) => {
      task[key] = sanitizedBody[key]
    })

    task.sponsorLogo = sponsorLogo ?? task.sponsorLogo
    task.bannerImage = bannerImage ?? task.bannerImage

    await task.save()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Task updated successfully',
      data: task,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.deleteTask = async function (req, res, next) {
  try {
    const task = await Task.findByPk(req.params.id)
    if (!task) {
      return next(CustomError.badRequest('Task with that id does not exist'))
    }

    if (task.sponsorLogo) {
      await firebase.deleteFile(task.sponsorLogo)
    }

    if (task.bannerImage) {
      await firebase.deleteFile(task.bannerImage)
    }

    await task.destroy()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Task deleted successfully',
      data: task,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getTask = async function (req, res, next) {
  try {
    const task = await Task.findByPk(req.params.id)
    if (!task) {
      return next(CustomError.badRequest('Invalid task id'))
    }

    const taskObj = task.toJSON ? task.toJSON() : task
    const arrayFields = ['requirements', 'guidelines', 'selectionCriteria', 'howToSubmit']
    arrayFields.forEach(field => {
      if (typeof taskObj[field] === 'string') {
        try {
          taskObj[field] = JSON.parse(taskObj[field])
        } catch (e) {
        }
      }
    })

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Task fetched successfully',
      data: taskObj,
    })
  } catch (error) {
    return next({ error })
  }
}

// module.exports.checkTaskReviewStatus = async function (req, res, next) {
//   try {
//     const { id } = req.params;

//     const submissionsCount = await Submission.count({
//       where: {
//         taskId: id
//       }
//     });

//     if (submissionsCount === 0) {
//       return next(CustomError.badRequest('No submissions found for this task'));
//     }

//     const pendingSubmission = await Submission.findOne({
//       where: {
//         taskId: id,
//         status: 'pending'
//       }
//     });

//     if (pendingSubmission) {
//       return res.status(OK).json({
//         success: true,
//         isComplete: false,
//         message: 'There are still pending submissions for this task.'
//       });
//     }

//     res.status(OK).json({
//       success: true,
//       isComplete: true,
//       message: 'All submissions have been processed.'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// module.exports.processTaskPayout = async function (req, res, next) {
//   const t = await sequelize.transaction();
//   try {
//     const { id } = req.params;

//     const task = await Task.findOne({
//       where: {
//         id: id,
//         status: 'ended'
//       }
//     });
//     if (!task) return next(CustomError.badRequest('Task not found or has not ended yet'));

//     if (task.payoutDistributed) {
//       return next(CustomError.badRequest('Payout has already been distributed for this task'));
//     }

//     const pendingCount = await Submission.count({ where: { taskId: id, status: 'pending' } });
//     if (pendingCount > 0) {
//       return next(CustomError.badRequest('All submissions must be Approved or Rejected before payout'));
//     }

//     const approvedSubmissions = await Submission.findAll({
//       where: { taskId: id, status: 'approved' },
//       attributes: [[sequelize.fn('DISTINCT', sequelize.col('userId')), 'userId']],
//       raw: true
//     });

//     const uniqueUserCount = approvedSubmissions.length;

//     if (uniqueUserCount === 0) {
//       await task.update({ payoutDistributed: true }, { t });
//       await t.commit();
//       return res.status(OK).json({ success: true, message: 'No approved users. No funds distributed.' });
//     }

//     const payoutPerUser = task.totalPool / uniqueUserCount;

//     const userIds = approvedSubmissions.map(s => s.userId);

//     await User.update(
//       { balance: sequelize.literal(`balance + ${payoutPerUser}`) },
//       {
//         where: { id: userIds },
//         t
//       }
//     );

//     await task.update({
//       payoutDistributed: true,
//     }, { t });

//     await t.commit();

//     const templatePath = path.join(__dirname, "../templates/default_email.handlebars");
//     const defaultContent = fs.readFileSync(templatePath, "utf8");
//     const compileTemplate = handlebars.compile(defaultContent);

//     const users = await User.findAll({
//       where: { id: userIds },
//       attributes: ['id', 'email', 'fullName']
//     });

//     const emailPromises = users.map(user => {
//       const htmlContent = compileTemplate({
//         fullName: user.fullName,
//         email: user.email,
//         message: `You have received a payout of ${payoutPerUser.toFixed(2)} for task "${task.title}". Your balance has been updated.`
//       });
//       return sendEmail(user.email, "Task Payout Received", htmlContent);
//     });

//     await Promise.all(emailPromises);

//     res.status(OK).json({
//       success: true,
//       message: `Distributed ${task.totalPool} among ${uniqueUserCount} users (${payoutPerUser.toFixed(2)} each).`
//     });

//   } catch (error) {
//     if (t) await t.rollback();
//     next(error);
//   }
// };
