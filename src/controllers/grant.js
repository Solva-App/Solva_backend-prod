const { Schema } = require('json-validace')
const Job = require('../models/Job')
const { OK } = require('http-status-codes')
const CustomError = require('../helpers/error')
const Grant = require('../models/Grant')

module.exports.createGrant = async function (req, res, next) {
  try {
    const schema = new Schema({
      link: { type: 'string', required: true },
    })

    const result = schema.validate(req.body)
    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error))
    }

    const grant = await Grant.create({
      owner: req.user.id,
      link: req.body.link,
    })

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'grant created successfully',
      data: grant,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getGrants = async function (req, res, next) {
  try {
    if (!(req.user.category === 'admin' || req.user.category === 'premium')) {
      return next(CustomError.forbiddenRequest('Only admin and premium users can access this route'))
    }
    const grants = await Grant.findAll()
    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'grant fetched successfully',
      data: grants,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.updateGrant = async function (req, res, next) {
  try {
    const schema = new Schema({
      link: { type: 'string', required: false },
    })

    const result = schema.validate(req.body)
    if (result.error) {
      return next(CustomError.badRequest('Invalid request body', result.error))
    }

    const grant = await Grant.findByPk(req.params.id)
    if (!grant) {
      return next(CustomError.badRequest('grant with that id does not exist'))
    }

    grant.link = req.body.link ?? grant.link

    await grant.save()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'grant updated successfully',
      data: grant,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.deleteGrant = async function (req, res, next) {
  try {
    const grant = await Grant.findByPk(req.params.id)
    if (!grant) {
      return next(CustomError.badRequest('grant with that id does not exist'))
    }

    // delete job
    await grant.destroy()

    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'Grant deleted successfully',
      data: grant,
    })
  } catch (error) {
    return next({ error })
  }
}

module.exports.getGrant = async function (req, res, next) {
  try {
    if (!(req.user.category === 'admin' || req.user.category === 'premium')) {
      return next(CustomError.forbiddenRequest('Only admin and premium users can access this route'))
    }
    const grant = await Grant.findByPk(req.params.id)
    res.status(OK).json({
      success: true,
      status: res.statusCode,
      message: 'grant fetched successfully',
      data: grant,
    })
  } catch (error) {
    return next({ error })
  }
}