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
const paystack = require('../http/paystack')

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

module.exports.createCompanyTaskDraft = async function (req, res, next) {
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
    numberFields.forEach((field) => {
      if (sanitizedBody[field] !== undefined && sanitizedBody[field] !== '') {
        sanitizedBody[field] = Number(sanitizedBody[field])
      }
    })

    const arrayFields = ['requirements', 'guidelines', 'selectionCriteria', 'howToSubmit']
    arrayFields.forEach((field) => {
      if (typeof sanitizedBody[field] === 'string') {
        try {
          let cleanStr = sanitizedBody[field].trim().replace(/'/g, '"')
          sanitizedBody[field] = JSON.parse(cleanStr)
        } catch (e) {
          sanitizedBody[field] = sanitizedBody[field].split(',').map((item) => item.trim())
        }
      }
    })

    const result = schema.validate(sanitizedBody)
    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error))
    }

    if (new Date(sanitizedBody.startDate) >= new Date(sanitizedBody.endDate)) {
      return next(CustomError.badRequest('Start date must be before end date'))
    }

    let sponsorLogo = null
    let bannerImage = null

    if (req.files?.sponsorLogo?.length) {
      const upload = await firebase.fileUpload(req.files.sponsorLogo[0], 'tasks')
      if (upload instanceof CustomError) return next(upload)
      sponsorLogo = upload
    }

    if (req.files?.bannerImage?.length) {
      const upload = await firebase.fileUpload(req.files.bannerImage[0], 'tasks')
      if (upload instanceof CustomError) return next(upload)
      bannerImage = upload
    }

    const draftTask = await Task.create({
      owner: req.user.id,
      ...sanitizedBody,
      sponsorLogo,
      bannerImage,
      status: 'draft',
      isPaid: false,
    })

    const amountInKobo = Math.round(Number(sanitizedBody.totalPool) * 100)
    const paymentInit = await paystack.generatePaymentLink({
      email: req.user.email,
      amount: amountInKobo,
      metadata: {
        userId: req.user.id,
        taskId: draftTask.id,
        taskType: 'company_task',
      },
    })

    if (paymentInit instanceof CustomError) {
      return next(paymentInit)
    }

    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Draft task created. Complete payment to activate task.',
      data: {
        taskId: draftTask.id,
        authorizationUrl: paymentInit.data.authorization_url,
        accessCode: paymentInit.data.access_code,
        reference: paymentInit.data.reference,
      },
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.verifyAndActivateCompanyTask = async function (req, res, next) {
  try {
    const schema = new Schema({
      taskId: { type: 'string', required: true },
      paymentReference: { type: 'string', required: true },
    })

    const result = schema.validate(req.body)
    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error))
    }

    const { taskId, paymentReference } = req.body

    const task = await Task.findByPk(taskId)
    if (!task) {
      return next(CustomError.notFound('Task not found'))
    }

    if (task.owner !== req.user.id) {
      return next(CustomError.forbidden('Unauthorized access to this task'))
    }

    if (task.isPaid && task.status !== 'draft') {
      return next(CustomError.badRequest('Task has already been paid and activated'))
    }

    const payment = await paystack.verifyTransaction(paymentReference)
    if (payment instanceof CustomError) return next(payment)

    if (!payment?.status || payment?.data?.status !== 'success') {
      return next(CustomError.badRequest('Payment failed or transaction was not successful'))
    }

    const expectedAmountInKobo = Math.round(Number(task.totalPool) * 100)
    const paidAmountInKobo = Number(payment.data.amount)

    if (paidAmountInKobo < expectedAmountInKobo) {
      return next(
        CustomError.badRequest(
          `Insufficient payment. Expected ₦${task.totalPool}, but received ₦${paidAmountInKobo / 100}`
        )
      )
    }

    const now = new Date()
    const start = new Date(task.startDate)

    task.isPaid = true
    task.paymentReference = paymentReference
    task.status = start > now ? 'upcoming' : 'active'

    await task.save()

    return res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Payment verified and task activated successfully',
      data: task,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getCompanyTasks = async function (req, res, next) {
  try {
    const tasks = await Task.findAll({
      where: { owner: req.user.id },
      order: [['createdAt', 'DESC']],
    })

    const parsedTasks = tasks.map((task) => {
      const taskObj = task.toJSON ? task.toJSON() : task
      const arrayFields = ['requirements', 'guidelines', 'selectionCriteria', 'howToSubmit']
      arrayFields.forEach((field) => {
        if (typeof taskObj[field] === 'string') {
          try {
            taskObj[field] = JSON.parse(taskObj[field])
          } catch (e) {}
        }
      })
      return taskObj
    })

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Company tasks fetched successfully',
      data: parsedTasks,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getCompanyTask = async function (req, res, next) {
  try {
    const task = await Task.findOne({
      where: { id: req.params.id, owner: req.user.id },
    })

    if (!task) {
      return next(CustomError.notFound('Company task not found or unauthorized'))
    }

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      data: task,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.updateCompanyTask = async function (req, res, next) {
  try {
    const task = await Task.findByPk(req.params.id)

    if (!task) {
      return next(CustomError.notFound('Task not found'))
    }

    if (task.owner !== req.user.id) {
      return next(CustomError.forbidden('You can only update tasks created by your company'))
    }

    const sanitizedBody = { ...req.body }

    let sponsorLogo = task.sponsorLogo
    let bannerImage = task.bannerImage

    if (req.files?.sponsorLogo?.length) {
      if (task.sponsorLogo) await firebase.deleteFile(task.sponsorLogo)
      const upload = await firebase.fileUpload(req.files.sponsorLogo[0], 'tasks')
      if (upload instanceof CustomError) return next(upload)
      sponsorLogo = upload
    }

    if (req.files?.bannerImage?.length) {
      if (task.bannerImage) await firebase.deleteFile(task.bannerImage)
      const upload = await firebase.fileUpload(req.files.bannerImage[0], 'tasks')
      if (upload instanceof CustomError) return next(upload)
      bannerImage = upload
    }

    Object.keys(sanitizedBody).forEach((key) => {
      task[key] = sanitizedBody[key]
    })

    task.sponsorLogo = sponsorLogo
    task.bannerImage = bannerImage

    await task.save()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Company task updated successfully',
      data: task,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.deleteCompanyTask = async function (req, res, next) {
  try {
    const task = await Task.findByPk(req.params.id)

    if (!task) {
      return next(CustomError.notFound('Task not found'))
    }

    if (task.owner !== req.user.id) {
      return next(CustomError.forbidden('You can only delete tasks created by your company'))
    }

    if (task.sponsorLogo) await firebase.deleteFile(task.sponsorLogo)
    if (task.bannerImage) await firebase.deleteFile(task.bannerImage)

    await task.destroy()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Company task deleted successfully',
      data: task,
    })
  } catch (error) {
    return next({ error })
  }
}