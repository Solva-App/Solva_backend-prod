const { Schema } = require('json-validace')
const { OK } = require('http-status-codes')
const CustomError = require('../helpers/error')
const Scholarship = require('../models/Scholarship')

module.exports.createScholarship = async function (req, res, next) {
    try {
        const schema = new Schema({
            name: { type: 'string', required: true },
            link: { type: 'string', required: true },
            description: { type: 'string', required: true },
        })

        const result = schema.validate(req.body)
        if (result.error) {
            return next(CustomError.badRequest('Invalid request body', result.error))
        }

        const scholarship = await Scholarship.create({
            owner: req.user.id,
            link: req.body.link,
            name: req.body.name,
            description: req.body.description,
        })

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Scholarship created successfully',
            data: scholarship,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.getScholarships = async function (req, res, next) {
    try {
        const scholarships = await Scholarship.findAll()

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Scholarship fetched successfully',
            data: scholarships,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.updateScholarship = async function (req, res, next) {
    try {
        const schema = new Schema({
            name: { type: 'string', required: false },
            link: { type: 'string', required: false },
            description: { type: 'string', required: false },
        })

        const result = schema.validate(req.body)
        if (result.error) {
            return next(CustomError.badRequest('Invalid request body', result.error))
        }

        const scholarship = await Scholarship.findByPk(req.params.id)
        if (!scholarship) {
            return next(CustomError.badRequest('Scholarship with that id does not exist'))
        }

        scholarship.name = req.body.name ?? scholarship.name
        scholarship.link = req.body.link ?? scholarship.link
        scholarship.description = req.body.description ?? scholarship.description

        await scholarship.save()

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'scholarship updated successfully',
            data: scholarship,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.deleteScholarship = async function (req, res, next) {
    try {
        const scholarship = await Scholarship.findByPk(req.params.id)
        if (!scholarship) {
            return next(CustomError.badRequest('Scholarship with that id does not exist'))
        }

        // delete job
        await scholarship.destroy()

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Job deleted successfully',
            data: scholarship,
        })
    } catch (error) {
        return next({ error })
    }
}

module.exports.getScholarship = async function (req, res, next) {
    try {
        const scholarship = await Scholarship.findByPk(req.params.id)

        res.status(OK).json({
            success: true,
            status: res.statusCode,
            message: 'Scholarship fetched successfully',
            data: scholarship,
        })
    } catch (error) {
        return next({ error })
    }
}
