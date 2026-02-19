const { Schema } = require('json-validace')
const { OK } = require('http-status-codes')
const CustomError = require('../helpers/error')
const Task = require('../models/Task')
const firebase = require("./../helpers/firebase")

module.exports.createTask = async function (req, res, next) {
  try {
    const schema = new Schema({
      title: { type: 'string', required: true },
      overview: { type: 'string', required: true },
      type: { type: 'string', required: false },
      sponsorName: { type: 'string', required: false },
      requirements: { type: 'string', required: false },
      guidelines: { type: 'string', required: false },
      selectionCriteria: { type: 'string', required: false },
      howToSubmit: { type: 'string', required: false },
      startDate: { type: 'string', format: 'date-time', required: true },
      endDate: { type: 'string', format: 'date-time', required: true },
      totalPool: { type: 'string', required: true },
      totalSpots: { type: 'string', required: true },
    })

    const result = schema.validate(req.body)

    if (result.error) {
      return next(
        CustomError.badRequest('Invalid request body', result.error)
      )
    }

    const body = req.body
    console.log(body)

    if (new Date(body.startDate) >= new Date(body.endDate)) {
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
      ...req.body,
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
    // if (!(req.user.category === 'admin' || req.user.category === 'premium')) {
    //   return next(CustomError.forbiddenRequest('Only admin and premium users can access this route'))
    // }

    const tasks = await Task.findAll()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Task fetched successfully',
      data: tasks,
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
      requirements: { type: 'string', required: false },
      guidelines: { type: 'string', required: false },
      selectionCriteria: { type: 'string', required: false },
      howToSubmit: { type: 'string', required: false },
      startDate: { type: 'string', format: 'date-time', required: false },
      endDate: { type: 'string', format: 'date-time', required: false },
      totalPool: { type: 'string', required: false },
      totalSpots: { type: 'string', required: false },
    })

    const result = schema.validate(req.body)

    if (result.error) {
      return next(
        CustomError.badRequest('Invalid request body', result.error)
      )
    }

    const task = await Task.findByPk(req.params.id)

    if (!task) {
      return next(CustomError.badRequest('Task with that id does not exist'))
    }

    const body = req.body

    if (body.startDate && body.endDate) {
      if (new Date(body.startDate) >= new Date(body.endDate)) {
        return next(
          CustomError.badRequest('Start date must be before end date')
        )
      }
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

    // Object.keys(body).forEach((key) => {
    //   task[key] = body[key]
    // })

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
    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Task fetched successfully',
      data: task,
    })
  } catch (error) {
    return next({ error })
  }
}
