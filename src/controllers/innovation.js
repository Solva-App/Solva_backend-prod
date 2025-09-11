const { Schema } = require('json-validace')
const { OK } = require('http-status-codes')
const CustomError = require('../helpers/error')
const Innovation = require('../models/Innovation')

module.exports.createInnovation = async function (req, res, next) {
  try {
    const schema = new Schema({
      link: { type: 'string', required: true },
    })

    const result = schema.validate(req.body)
    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error))
    }

    const innovation = await Innovation.create({
      owner: req.user.id,
      link: req.body.link,
    })

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Innovation created successfully',
      data: innovation,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getInnovations = async function (req, res, next) {
  try {
    if (req.user.category !== 'premium') {
      return next(CustomError.forbidden('Only premium users can access this route'))
    }
    const innovations = await Innovation.findAll()
    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Innovation fetched successfully',
      data: innovations,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.updateInnovation = async function (req, res, next) {
  try {
    const schema = new Schema({
      link: { type: 'string', required: false },
    })

    const result = schema.validate(req.body)
    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error))
    }

    const innovation = await Innovation.findByPk(req.params.id)
    if (!innovation) {
      return next(CustomError.badRequest('Innovation with that id does not exist'))
    }

    innovation.link = req.body.link ?? innovation.link

    await innovation.save()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Innovation updated successfully',
      data: innovation,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.deleteInnovation = async function (req, res, next) {
  try {
    const innovation = await Innovation.findByPk(req.params.id)
    if (!innovation) {
      return next(CustomError.badRequest('Innovation with that id does not exist'))
    }

    // delete job
    await innovation.destroy()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Innovation deleted successfully',
      data: innovation,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getInnovation = async function (req, res, next) {
  try {
    if (req.user.category !== 'premium') {
      return next(CustomError.forbidden('Only premium users can access this route'))
    }
    const innovation = await Innovation.findByPk(req.params.id)
    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Innovation fetched successfully',
      data: innovation,
    })
  } catch (error) {
    return next({ error })
  }
}